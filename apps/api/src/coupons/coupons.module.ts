import { Module } from '@nestjs/common';
import { CouponsController } from './coupons.controller.js';
import { CouponsService } from './coupons.service.js';

@Module({
  controllers: [CouponsController],
  providers: [CouponsService],
})
export class CouponsModule {}
