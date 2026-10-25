import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { OrdersService } from './orders.service.js';

@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  createOrder(@CurrentUser() userId: string, @Body() dto: CreateOrderDto) {
    return this.orders.createOrder(userId, dto.cartId);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() userId: string) {
    return this.orders.listForUser(userId);
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  getOrder(@Param('id') id: string) {
    return this.orders.getOrder(id);
  }

  @Post('orders/:id/reorder')
  @UseGuards(JwtAuthGuard)
  reorder(@CurrentUser() userId: string, @Param('id') id: string, @Body('storeId') storeId: string) {
    return this.orders.reorder(userId, id, storeId);
  }

  @Post('payments/:id/razorpay-order')
  @UseGuards(JwtAuthGuard)
  createRazorpayOrder(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.orders.createRazorpayOrder(userId, id);
  }

  @Post('payments/:id/verify')
  @UseGuards(JwtAuthGuard)
  verifyPayment(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: VerifyPaymentDto) {
    return this.orders.verifyPayment(userId, id, dto);
  }

  @Post('payments/:id/mock-pay')
  @UseGuards(JwtAuthGuard)
  mockPay(@Param('id') id: string) {
    return this.orders.mockPay(id);
  }

  @Post('payments/webhook/razorpay')
  razorpayWebhook(@Req() req: RawBodyRequest<Request>, @Headers('x-razorpay-signature') signature?: string) {
    return this.orders.razorpayWebhook(req.rawBody, signature);
  }
}
