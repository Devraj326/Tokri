import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CartModule } from '../cart/cart.module.js';
import { KitAiController } from './kit-ai.controller.js';
import { KitAiService } from './kit-ai.service.js';

@Module({
  imports: [CartModule, JwtModule.register({})],
  controllers: [KitAiController],
  providers: [KitAiService],
})
export class KitAiModule {}
