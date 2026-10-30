import { IsIn } from 'class-validator';

export class AdminUpdateOrderStatusDto {
  @IsIn(['confirmed', 'packing', 'out_for_delivery', 'delivered'])
  status!: 'confirmed' | 'packing' | 'out_for_delivery' | 'delivered';
}
