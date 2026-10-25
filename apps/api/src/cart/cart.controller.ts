import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CartService } from './cart.service.js';
import { CreateSharedCartDto, CreateSoloCartDto } from './dto/create-cart.dto.js';
import { AddItemDto, UpdateItemDto } from './dto/item.dto.js';
import { CartGateway } from './cart.gateway.js';

@Controller('carts')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(
    private readonly cart: CartService,
    private readonly gateway: CartGateway,
  ) {}

  @Post()
  createSolo(@CurrentUser() userId: string, @Body() dto: CreateSoloCartDto) {
    return this.cart.createSoloCart(userId, dto.storeId, dto.addressId);
  }

  @Post('shared')
  createShared(@CurrentUser() userId: string, @Body() dto: CreateSharedCartDto) {
    return this.cart.createSharedCart(userId, dto.storeId, dto.name, dto.addressId);
  }

  @Post('join/:inviteCode')
  async join(@CurrentUser() userId: string, @Param('inviteCode') inviteCode: string) {
    const state = await this.cart.joinByInvite(inviteCode, userId);
    this.gateway.broadcastState(state.id, state);
    return state;
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.cart.getCartState(id);
  }

  @Get(':id/bill')
  bill(@Param('id') id: string) {
    return this.cart.bill(id);
  }

  @Post(':id/items')
  async addItem(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: AddItemDto) {
    const { item, version } = await this.cart.addItem(id, userId, dto.variantId, dto.qty, dto.note);
    this.gateway.broadcastItemAdded(id, item, version);
    return item;
  }

  @Patch(':id/items/:itemId')
  async updateItem(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    const { item, version } = await this.cart.updateItemQty(id, itemId, userId, dto.qty);
    this.gateway.broadcastItemUpdated(id, item, version);
    return item;
  }

  @Delete(':id/items/:itemId')
  async removeItem(@CurrentUser() userId: string, @Param('id') id: string, @Param('itemId') itemId: string) {
    const cart = await this.cart.getCartState(id);
    const isHost = cart.hostId === userId;
    const { version } = await this.cart.removeItem(id, itemId, userId, isHost);
    this.gateway.broadcastItemRemoved(id, itemId, version);
    return { ok: true };
  }

  @Post(':id/lock')
  async lock(@CurrentUser() userId: string, @Param('id') id: string) {
    const { version, holdExpiresInMinutes } = await this.cart.lockCart(id, userId);
    this.gateway.broadcastLocked(id, version);
    return { locked: true, holdExpiresInMinutes };
  }

  @Post(':id/budget')
  async setBudget(@CurrentUser() userId: string, @Param('id') id: string, @Body('budgetCap') budgetCap: number | null) {
    const version = await this.cart.setBudgetCap(id, userId, budgetCap);
    const state = await this.cart.getCartState(id);
    this.gateway.broadcastState(id, state);
    return { version };
  }

  @Get(':id/shares')
  shares(@Param('id') id: string) {
    return this.cart.computeShares(id);
  }

  @Post(':id/split')
  async split(@CurrentUser() userId: string, @Param('id') id: string, @Body('splitMode') splitMode: any) {
    const result = await this.cart.setSplitMode(id, userId, splitMode);
    this.gateway.broadcastSplitUpdated(id, result.splitMode, result.shares, result.version);
    return result;
  }

  @Post(':id/transfer-host')
  async transferHost(@CurrentUser() userId: string, @Param('id') id: string, @Body('newHostId') newHostId: string) {
    const version = await this.cart.transferHost(id, userId, newHostId);
    const state = await this.cart.getCartState(id);
    this.gateway.broadcastState(id, state);
    return { version };
  }

  @Delete(':id/members/:userId')
  async removeMember(@CurrentUser() userId: string, @Param('id') id: string, @Param('userId') targetUserId: string) {
    await this.cart.removeMember(id, userId, targetUserId);
    const state = await this.cart.getCartState(id);
    this.gateway.broadcastState(id, state);
    return { ok: true };
  }
}
