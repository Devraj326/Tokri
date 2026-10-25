import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { CartGateway } from './cart.gateway.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [CartController],
  providers: [CartService, CartGateway],
  exports: [CartService, CartGateway],
})
export class CartModule {}
