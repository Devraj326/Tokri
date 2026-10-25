import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { CartService } from './cart.service.js';

function room(cartId: string) {
  return `cart:${cartId}`;
}

@Injectable()
@WebSocketGateway({ cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true } })
export class CartGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly cart: CartService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      client.data.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('cart:join')
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { cartId: string }) {
    await client.join(room(body.cartId));
    const state = await this.cart.getCartState(body.cartId);
    client.emit('cart:state', state);
  }

  @SubscribeMessage('item:add')
  async onItemAdd(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { cartId: string; variantId: string; qty: number; note?: string },
  ) {
    const { item, version } = await this.cart.addItem(body.cartId, client.data.userId, body.variantId, body.qty, body.note);
    this.server.to(room(body.cartId)).emit('item:added', { cartId: body.cartId, item, version });
  }

  @SubscribeMessage('item:update')
  async onItemUpdate(@ConnectedSocket() client: Socket, @MessageBody() body: { cartId: string; itemId: string; qty: number }) {
    const { item, version } = await this.cart.updateItemQty(body.cartId, body.itemId, client.data.userId, body.qty);
    this.server.to(room(body.cartId)).emit('item:updated', { cartId: body.cartId, item, version });
  }

  @SubscribeMessage('item:remove')
  async onItemRemove(@ConnectedSocket() client: Socket, @MessageBody() body: { cartId: string; itemId: string }) {
    const state = await this.cart.getCartState(body.cartId);
    const isHost = state.hostId === client.data.userId;
    const { version } = await this.cart.removeItem(body.cartId, body.itemId, client.data.userId, isHost);
    this.server.to(room(body.cartId)).emit('item:removed', { cartId: body.cartId, itemId: body.itemId, version });
  }

  @SubscribeMessage('item:react')
  async onItemReact(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { cartId: string; itemId: string; value: 'up' | 'down' },
  ) {
    const { item, version } = await this.cart.reactToItem(body.cartId, body.itemId, client.data.userId, body.value);
    this.server.to(room(body.cartId)).emit('item:updated', { cartId: body.cartId, item, version });
  }

  @SubscribeMessage('member:done')
  async onMemberDone(@ConnectedSocket() client: Socket, @MessageBody() body: { cartId: string; isDone: boolean }) {
    const version = await this.cart.setMemberDone(body.cartId, client.data.userId, body.isDone);
    const state = await this.cart.getCartState(body.cartId);
    this.server.to(room(body.cartId)).emit('cart:state', { ...state, version });
  }

  @SubscribeMessage('presence:ping')
  onPresencePing(@ConnectedSocket() client: Socket, @MessageBody() body: { cartId: string }) {
    client.to(room(body.cartId)).emit('member:joined', { cartId: body.cartId, member: { userId: client.data.userId } });
  }

  broadcastState(cartId: string, state: unknown) {
    this.server.to(room(cartId)).emit('cart:state', state);
  }

  broadcastItemAdded(cartId: string, item: unknown, version: number) {
    this.server.to(room(cartId)).emit('item:added', { cartId, item, version });
  }

  broadcastItemUpdated(cartId: string, item: unknown, version: number) {
    this.server.to(room(cartId)).emit('item:updated', { cartId, item, version });
  }

  broadcastItemRemoved(cartId: string, itemId: string, version: number) {
    this.server.to(room(cartId)).emit('item:removed', { cartId, itemId, version });
  }

  broadcastLocked(cartId: string, version: number) {
    this.server.to(room(cartId)).emit('cart:locked', { cartId, version });
  }

  broadcastSplitUpdated(cartId: string, splitMode: string, shares: { userId: string; amount: number }[], version: number) {
    this.server.to(room(cartId)).emit('split:updated', { cartId, splitMode, shares, version });
  }

  broadcastPaymentStatus(cartId: string, userId: string, status: string) {
    this.server.to(room(cartId)).emit('payment:status', { cartId, userId, status });
  }

  broadcastOrderStatus(orderId: string, cartId: string, status: string, eta: string | null) {
    this.server.to(room(cartId)).emit('order:status', { orderId, status, eta });
  }

  broadcastOrdered(cartId: string, orderId: string, version: number) {
    this.server.to(room(cartId)).emit('cart:ordered', { cartId, orderId, version });
  }
}
