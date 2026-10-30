import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard.js';
import { AdminService } from './admin.service.js';
import { AdminUpdateUserDto } from './dto/update-user.dto.js';
import { AdminCreateProductDto, AdminUpdateProductDto } from './dto/product.dto.js';
import { AdminCreateVariantDto, AdminUpdateVariantDto, AdminUpsertInventoryDto } from './dto/variant.dto.js';
import { AdminCreateCategoryDto, AdminUpdateCategoryDto } from './dto/category.dto.js';
import { AdminUpdateOrderStatusDto } from './dto/order.dto.js';
import { AdminCreateStoreDto, AdminUpdateStoreDto } from './dto/store.dto.js';
import { AdminCreateCouponDto, AdminUpdateCouponDto } from './dto/coupon.dto.js';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('me')
  me() {
    return { isAdmin: true };
  }

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  // Users
  @Get('users')
  listUsers(@Query('search') search?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.admin.listUsers({ search, limit, offset });
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.admin.getUser(id);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.admin.updateUser(id, dto);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.admin.deleteUser(id);
  }

  // Products
  @Get('products')
  listProducts(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.admin.listProducts({ search, category, limit, offset });
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.admin.getProduct(id);
  }

  @Post('products')
  createProduct(@Body() dto: AdminCreateProductDto) {
    return this.admin.createProduct(dto);
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: AdminUpdateProductDto) {
    return this.admin.updateProduct(id, dto);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.admin.deleteProduct(id);
  }

  @Post('products/:id/variants')
  createVariant(@Param('id') id: string, @Body() dto: AdminCreateVariantDto) {
    return this.admin.createVariant(id, dto);
  }

  @Patch('variants/:id')
  updateVariant(@Param('id') id: string, @Body() dto: AdminUpdateVariantDto) {
    return this.admin.updateVariant(id, dto);
  }

  @Delete('variants/:id')
  deleteVariant(@Param('id') id: string) {
    return this.admin.deleteVariant(id);
  }

  @Patch('variants/:id/inventory')
  upsertInventory(@Param('id') id: string, @Body() dto: AdminUpsertInventoryDto) {
    return this.admin.upsertInventory(id, dto.storeId, dto.qtyAvailable);
  }

  // Categories
  @Get('categories')
  listCategories() {
    return this.admin.listCategories();
  }

  @Post('categories')
  createCategory(@Body() dto: AdminCreateCategoryDto) {
    return this.admin.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: AdminUpdateCategoryDto) {
    return this.admin.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.admin.deleteCategory(id);
  }

  // Orders
  @Get('orders')
  listOrders(@Query('status') status?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.admin.listOrders({ status, limit, offset });
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.admin.getOrder(id);
  }

  @Patch('orders/:id')
  updateOrderStatus(@Param('id') id: string, @Body() dto: AdminUpdateOrderStatusDto) {
    return this.admin.updateOrderStatus(id, dto.status);
  }

  // Stores
  @Get('stores')
  listStores() {
    return this.admin.listStores();
  }

  @Post('stores')
  createStore(@Body() dto: AdminCreateStoreDto) {
    return this.admin.createStore(dto);
  }

  @Patch('stores/:id')
  updateStore(@Param('id') id: string, @Body() dto: AdminUpdateStoreDto) {
    return this.admin.updateStore(id, dto);
  }

  @Delete('stores/:id')
  deleteStore(@Param('id') id: string) {
    return this.admin.deleteStore(id);
  }

  // Coupons
  @Get('coupons')
  listCoupons() {
    return this.admin.listCoupons();
  }

  @Post('coupons')
  createCoupon(@Body() dto: AdminCreateCouponDto) {
    return this.admin.createCoupon(dto);
  }

  @Patch('coupons/:id')
  updateCoupon(@Param('id') id: string, @Body() dto: AdminUpdateCouponDto) {
    return this.admin.updateCoupon(id, dto);
  }

  @Delete('coupons/:id')
  deleteCoupon(@Param('id') id: string) {
    return this.admin.deleteCoupon(id);
  }

  // Reviews
  @Get('reviews')
  listReviews(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.admin.listReviews({ limit, offset });
  }

  @Delete('reviews/:id')
  deleteReview(@Param('id') id: string) {
    return this.admin.deleteReview(id);
  }
}
