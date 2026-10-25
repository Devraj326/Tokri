import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CartModule } from '../cart/cart.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [CartModule, JwtModule.register({})],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
