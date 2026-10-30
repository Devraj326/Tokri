import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'node:crypto';
import Razorpay from 'razorpay';
import { PrismaService } from '../prisma/prisma.service.js';
import { CartService } from '../cart/cart.service.js';
import { CartGateway } from '../cart/cart.gateway.js';

const STATUS_SEQUENCE: Array<'confirmed' | 'packing' | 'out_for_delivery' | 'delivered'> = [
  'confirmed',
  'packing',
  'out_for_delivery',
  'delivered',
];
const STATUS_STEP_MS = 6000;

@Injectable()
export class OrdersService {
  private razorpayClient: Razorpay | null = null;
  private readonly progressionStarted = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly gateway: CartGateway,
    private readonly config: ConfigService,
  ) {}

  private isMockPayments(): boolean {
    return (this.config.get<string>('MOCK_PAYMENTS') ?? 'true') === 'true';
  }

  private getRazorpay(): Razorpay {
    if (this.razorpayClient) return this.razorpayClient;
    const key_id = this.config.get<string>('RAZORPAY_KEY_ID');
    const key_secret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!key_id || !key_secret) throw new BadRequestException('Razorpay is not configured');
    this.razorpayClient = new Razorpay({ key_id, key_secret });
    return this.razorpayClient;
  }

  async createOrder(userId: string, cartId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId }, include: { members: true } });
    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.status !== 'locked') throw new BadRequestException('Lock the cart before placing the order');
    if (!cart.members.some((m) => m.userId === userId)) throw new BadRequestException('Not a member of this cart');

    const bill = await this.cartService.bill(cartId);
    const shares = await this.cartService.computeShares(cartId);
    const etaMinutes = 15;

    const order = await this.prisma.order.create({
      data: {
        cartId,
        storeId: cart.storeId,
        userId: cart.hostId,
        total: bill.total,
        status: 'confirmed',
        riderName: 'Suresh (on a scooter)',
        eta: new Date(Date.now() + etaMinutes * 60 * 1000),
      },
    });

    const mockPayments = this.isMockPayments();
    const payments = await Promise.all(
      shares
        .filter((s) => s.amount > 0)
        .map((s) =>
          this.prisma.payment.create({
            data: {
              orderId: order.id,
              payerId: s.userId,
              amount: s.amount,
              razorpayRef: mockPayments ? `mock_pay_${randomBytes(6).toString('hex')}` : null,
              status: mockPayments ? 'paid' : 'pending',
            },
          }),
        ),
    );

    const updatedCart = await this.prisma.cart.update({
      where: { id: cartId },
      data: { status: 'ordered', version: { increment: 1 } },
    });

    if (bill.couponCode) {
      await this.prisma.coupon.updateMany({ where: { code: bill.couponCode }, data: { usedCount: { increment: 1 } } });
    }

    for (const p of payments) {
      this.gateway.broadcastPaymentStatus(cartId, p.payerId, p.status);
    }
    this.gateway.broadcastOrdered(cartId, order.id, updatedCart.version);

    if (mockPayments) {
      await this.maybeStartProgression(order.id, cartId);
    }

    return { order, payments };
  }

  async createRazorpayOrder(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.payerId !== userId) throw new ForbiddenException('Not your payment');
    if (payment.status === 'paid') return { mocked: true };

    if (this.isMockPayments()) {
      await this.markPaymentPaid(payment.id, `mock_pay_${randomBytes(6).toString('hex')}`);
      return { mocked: true };
    }

    const amountPaise = Math.round(payment.amount * 100);
    const rp = this.getRazorpay();
    const rpOrder = await rp.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: payment.id,
      notes: { paymentId: payment.id, orderId: payment.orderId },
    });
    await this.prisma.payment.update({ where: { id: payment.id }, data: { razorpayOrderId: rpOrder.id } });

    return {
      mocked: false,
      razorpayOrderId: rpOrder.id,
      amount: amountPaise,
      currency: 'INR',
      keyId: this.config.get<string>('RAZORPAY_KEY_ID'),
    };
  }

  async verifyPayment(
    userId: string,
    paymentId: string,
    body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.payerId !== userId) throw new ForbiddenException('Not your payment');
    if (payment.status === 'paid') return { status: 'paid' as const };
    if (payment.razorpayOrderId !== body.razorpayOrderId) throw new BadRequestException('Order mismatch');

    const secret = this.config.get<string>('RAZORPAY_KEY_SECRET') ?? '';
    const expected = createHmac('sha256', secret)
      .update(`${body.razorpayOrderId}|${body.razorpayPaymentId}`)
      .digest('hex');
    if (expected !== body.razorpaySignature) throw new BadRequestException('Payment verification failed');

    await this.markPaymentPaid(payment.id, body.razorpayPaymentId);
    return { status: 'paid' as const };
  }

  private async markPaymentPaid(paymentId: string, ref: string) {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'paid', razorpayRef: ref },
      include: { order: true },
    });
    this.gateway.broadcastPaymentStatus(payment.order.cartId, payment.payerId, 'paid');
    await this.maybeStartProgression(payment.orderId, payment.order.cartId);
    return payment;
  }

  private async maybeStartProgression(orderId: string, cartId: string) {
    if (this.progressionStarted.has(orderId)) return;
    this.progressionStarted.add(orderId);
    this.progressOrderStatus(orderId, cartId, 0);
  }

  private progressOrderStatus(orderId: string, cartId: string, stepIndex: number) {
    if (stepIndex >= STATUS_SEQUENCE.length - 1) return;
    setTimeout(async () => {
      const nextStatus = STATUS_SEQUENCE[stepIndex + 1];
      const order = await this.prisma.order.update({ where: { id: orderId }, data: { status: nextStatus } });
      this.gateway.broadcastOrderStatus(orderId, cartId, nextStatus, order.eta?.toISOString() ?? null);
      this.progressOrderStatus(orderId, cartId, stepIndex + 1);
    }, STATUS_STEP_MS);
  }

  async listForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { cart: { include: { items: { include: { variant: { include: { product: true } } } } } } },
    });
  }

  async reorder(userId: string, orderId: string, storeId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { cart: { include: { items: true } } } });
    if (!order) throw new NotFoundException('Order not found');

    const cart = await this.cartService.createSoloCart(userId, storeId);
    for (const item of order.cart.items) {
      await this.cartService.addItem(cart.id, userId, item.variantId, item.qty);
    }
    return this.cartService.getCartState(cart.id);
  }

  async getOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { payments: true, store: true } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async mockPay(paymentId: string) {
    return this.markPaymentPaid(paymentId, `mock_pay_${randomBytes(6).toString('hex')}`);
  }

  async razorpayWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret || !rawBody) {
      return { received: true };
    }
    if (!signature) throw new BadRequestException('Missing webhook signature');

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (expected !== signature) throw new BadRequestException('Invalid webhook signature');

    const payload = JSON.parse(rawBody.toString('utf8'));
    if (payload.event === 'payment.captured') {
      const rpOrderId = payload.payload?.payment?.entity?.order_id as string | undefined;
      const rpPaymentId = payload.payload?.payment?.entity?.id as string | undefined;
      if (rpOrderId) {
        const payment = await this.prisma.payment.findFirst({ where: { razorpayOrderId: rpOrderId } });
        if (payment && payment.status !== 'paid') {
          await this.markPaymentPaid(payment.id, rpPaymentId ?? rpOrderId);
        }
      }
    }
    return { received: true };
  }
}
