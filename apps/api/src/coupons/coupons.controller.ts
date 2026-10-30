import { Controller, Get } from '@nestjs/common';
import { CouponsService } from './coupons.service.js';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Get()
  listActive() {
    return this.coupons.listActive();
  }
}
