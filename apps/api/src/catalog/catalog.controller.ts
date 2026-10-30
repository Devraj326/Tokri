import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('stores/nearest')
  nearestStore(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.catalog.nearestStore(Number(lat), Number(lng));
  }

  @Get('categories')
  categories() {
    return this.catalog.categories();
  }

  @Get('products')
  products(
    @Query('category') category: string | undefined,
    @Query('store') store: string,
    @Query('subcategory') subcategory: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('offset') offset: string | undefined,
  ) {
    return this.catalog.products({
      categorySlug: category,
      storeId: store,
      subcategory,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('products/counts')
  productCounts(@Query('category') category: string) {
    return this.catalog.productCounts({ categorySlug: category });
  }

  @Get('products/:id')
  product(@Param('id') id: string, @Query('store') store: string) {
    return this.catalog.product(id, store);
  }

  @Get('search')
  search(@Query('q') q: string, @Query('store') store: string) {
    return this.catalog.search(q ?? '', store);
  }
}
