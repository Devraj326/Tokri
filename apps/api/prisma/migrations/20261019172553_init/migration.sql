-- CreateEnum
CREATE TYPE "CartType" AS ENUM ('solo', 'shared');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('open', 'locked', 'ordered', 'expired');

-- CreateEnum
CREATE TYPE "CartMemberRole" AS ENUM ('host', 'member', 'viewer');

-- CreateEnum
CREATE TYPE "SplitMode" AS ENUM ('host_pays_all', 'pay_for_own', 'split_equally', 'custom');

-- CreateEnum
CREATE TYPE "CartItemSource" AS ENUM ('manual', 'kit');

-- CreateEnum
CREATE TYPE "ReactionValue" AS ENUM ('up', 'down');

-- CreateEnum
CREATE TYPE "KitGoalType" AS ENUM ('recipe', 'repair', 'project', 'occasion', 'household');

-- CreateEnum
CREATE TYPE "KitItemBucket" AS ENUM ('in_stock', 'swap', 'not_on_tokri', 'probably_at_home');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('confirmed', 'packing', 'out_for_delivery', 'delivered');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed');

-- CreateEnum
CREATE TYPE "PantryKind" AS ENUM ('pantry', 'tool');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "line1" TEXT NOT NULL,
    "store_id" TEXT,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radius_km" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "is_open" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hindi_name" TEXT,
    "slug" TEXT NOT NULL,
    "parent_id" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hindi_name" TEXT,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category_id" TEXT NOT NULL,
    "brand" TEXT,
    "unit" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tile_color" TEXT NOT NULL DEFAULT 'haldi',
    "is_veg" BOOLEAN,
    "embedding" JSONB,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "mrp" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "store_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "qty_available" INTEGER NOT NULL DEFAULT 0,
    "qty_reserved" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("store_id","variant_id")
);

-- CreateTable
CREATE TABLE "product_aliases" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "canonical" TEXT NOT NULL,

    CONSTRAINT "product_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "type" "CartType" NOT NULL,
    "name" TEXT,
    "host_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "address_id" TEXT,
    "status" "CartStatus" NOT NULL DEFAULT 'open',
    "budget_cap" DOUBLE PRECISION,
    "split_mode" "SplitMode" NOT NULL DEFAULT 'host_pays_all',
    "invite_code" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_members" (
    "cart_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "CartMemberRole" NOT NULL DEFAULT 'member',
    "color" TEXT NOT NULL,
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_members_pkey" PRIMARY KEY ("cart_id","user_id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "added_by" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "source" "CartItemSource" NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_item_reactions" (
    "cart_item_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "value" "ReactionValue" NOT NULL,

    CONSTRAINT "cart_item_reactions_pkey" PRIMARY KEY ("cart_item_id","user_id")
);

-- CreateTable
CREATE TABLE "kits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cart_id" TEXT,
    "prompt" TEXT NOT NULL,
    "goal_type" "KitGoalType" NOT NULL,
    "servings" INTEGER,
    "normalized_key" TEXT NOT NULL,
    "llm_output" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_items" (
    "id" TEXT NOT NULL,
    "kit_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hindi_alias" TEXT,
    "qty" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "essential" BOOLEAN NOT NULL DEFAULT true,
    "bucket" "KitItemBucket" NOT NULL,
    "reason" TEXT,
    "matched_variant_id" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "kit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pantry_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PantryKind" NOT NULL DEFAULT 'pantry',

    CONSTRAINT "pantry_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'confirmed',
    "rider_name" TEXT,
    "eta" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "payer_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "razorpay_ref" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "product_aliases_alias_idx" ON "product_aliases"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "carts_invite_code_key" ON "carts"("invite_code");

-- CreateIndex
CREATE INDEX "kits_normalized_key_idx" ON "kits"("normalized_key");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_members" ADD CONSTRAINT "cart_members_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_members" ADD CONSTRAINT "cart_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_reactions" ADD CONSTRAINT "cart_item_reactions_cart_item_id_fkey" FOREIGN KEY ("cart_item_id") REFERENCES "cart_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_reactions" ADD CONSTRAINT "cart_item_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kits" ADD CONSTRAINT "kits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kits" ADD CONSTRAINT "kits_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_items" ADD CONSTRAINT "kit_items_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_items" ADD CONSTRAINT "kit_items_matched_variant_id_fkey" FOREIGN KEY ("matched_variant_id") REFERENCES "variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
