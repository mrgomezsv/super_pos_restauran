"""
Script para crear datos de demostración de recetas y producción
"""

from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db_session, Company as DBCompany
from database import (
    Product as DBProduct, Recipe as DBRecipe, RecipeIngredient as DBRecipeIngredient,
    ProductionOrder as DBProductionOrder, ProductionConsumption as DBProductionConsumption
)
from auth import get_password_hash

def create_demo_recipes():
    """Crear datos de demostración para recetas y producción"""
    print("=" * 80)
    print("CREANDO DATOS DE DEMOSTRACIÓN DE RECETAS Y PRODUCCIÓN")
    print("=" * 80)
    
    db = get_db_session()
    
    try:
        # Obtener la primera compañía (demo)
        company = db.query(DBCompany).first()
        
        if not company:
            print("❌ No se encontró ninguna compañía. Ejecuta init_db.py primero")
            return
        
        company_id = company.id
        print(f"\n✅ Compañía ID: {company_id}")
        
        # 1. Crear materias primas/ingredientes
        print("\n📦 PASO 1: Creando materias primas...")
        
        ingredients = [
            {
                "name": "Harina",
                "category": "Materia Prima",
                "price": 3.50,
                "cost": 2.00,
                "stock": 100,
                "unit": "kg"
            },
            {
                "name": "Pollo Entero",
                "category": "Materia Prima",
                "price": 8.00,
                "cost": 5.00,
                "stock": 50,
                "unit": "unidad"
            },
            {
                "name": "Aceite",
                "category": "Materia Prima",
                "price": 5.00,
                "cost": 3.50,
                "stock": 30,
                "unit": "litro"
            },
            {
                "name": "Sal",
                "category": "Materia Prima",
                "price": 1.50,
                "cost": 0.80,
                "stock": 200,
                "unit": "kg"
            },
            {
                "name": "Cebolla",
                "category": "Materia Prima",
                "price": 2.00,
                "cost": 1.20,
                "stock": 100,
                "unit": "kg"
            }
        ]
        
        ingredient_products = {}
        for ing in ingredients:
            # Verificar si ya existe
            existing = db.query(DBProduct).filter(
                DBProduct.company_id == company_id,
                DBProduct.name == ing["name"]
            ).first()
            
            if existing:
                print(f"   ⚠️  {ing['name']} ya existe")
                ingredient_products[ing["name"]] = existing
                continue
            
            # Obtener siguiente SKU
            from main import generate_next_sku
            sku = generate_next_sku(db, company_id)
            
            product = DBProduct(
                company_id=company_id,
                code=sku,
                name=ing["name"],
                description=f"Materia prima - {ing['unit']}",
                price=ing["price"],
                cost=ing["cost"],
                category=ing["category"],
                brand="Demo",
                stock=ing["stock"],
                minStock=10,
                maxStock=500,
                taxRate=13.0,
                isActive=True,
                createdAt=datetime.now(),
                updatedAt=datetime.now()
            )
            
            db.add(product)
            db.flush()
            ingredient_products[ing["name"]] = product
            print(f"   ✅ {ing['name']} - Stock: {ing['stock']} {ing['unit']}")
        
        db.commit()
        
        # 2. Crear producto final/platillo
        print("\n🍽️  PASO 2: Creando producto final...")
        
        existing_platillo = db.query(DBProduct).filter(
            DBProduct.company_id == company_id,
            DBProduct.name == "Pollo al Horno"
        ).first()
        
        if existing_platillo:
            print("   ⚠️  Pollo al Horno ya existe")
            platillo_product = existing_platillo
        else:
            sku = generate_next_sku(db, company_id)
            
            platillo_product = DBProduct(
                company_id=company_id,
                code=sku,
                name="Pollo al Horno",
                description="Platillo preparado con pollo, harina y especias",
                price=15.00,
                cost=0,  # Se calculará con la receta
                category="Platillos",
                brand="Casa",
                stock=0,  # Sin stock inicial
                minStock=5,
                maxStock=50,
                taxRate=13.0,
                isActive=True,
                createdAt=datetime.now(),
                updatedAt=datetime.now()
            )
            
            db.add(platillo_product)
            db.commit()
            db.refresh(platillo_product)
            print(f"   ✅ Pollo al Horno creado (Sin stock inicial)")
        
        # 3. Crear receta
        print("\n📝 PASO 3: Creando receta...")
        
        existing_recipe = db.query(DBRecipe).filter(
            DBRecipe.company_id == company_id,
            DBRecipe.product_id == platillo_product.id
        ).first()
        
        if existing_recipe:
            print("   ⚠️  La receta ya existe")
            recipe = existing_recipe
        else:
            recipe = DBRecipe(
                company_id=company_id,
                product_id=platillo_product.id,
                code="REC-001",
                name="Receta Pollo al Horno",
                description="Receta para preparar pollo al horno",
                batch_size=1.0,  # Produce 1 unidad
                unit_of_measure="unidad",
                preparation_time=60,
                cost_per_batch=0,
                isActive=True,
                createdAt=datetime.now(),
                updatedAt=datetime.now()
            )
            
            db.add(recipe)
            db.flush()
            
            # 4. Agregar ingredientes a la receta
            print("\n   Agregando ingredientes a la receta...")
            
            recipe_ingredients = [
                {"name": "Harina", "quantity": 0.1, "unit": "kg"},
                {"name": "Pollo Entero", "quantity": 1, "unit": "unidad"},
                {"name": "Aceite", "quantity": 0.05, "unit": "litro"},
                {"name": "Sal", "quantity": 0.01, "unit": "kg"},
                {"name": "Cebolla", "quantity": 0.05, "unit": "kg"}
            ]
            
            total_cost = 0.0
            for ing_data in recipe_ingredients:
                ing_product = ingredient_products[ing_data["name"]]
                
                ing_line = DBRecipeIngredient(
                    recipe_id=recipe.id,
                    ingredient_product_id=ing_product.id,
                    quantity=ing_data["quantity"],
                    unit_of_measure=ing_data["unit"],
                    unit_cost=ing_product.cost,
                    total_cost=ing_data["quantity"] * ing_product.cost,
                    notes=f"{ing_data['quantity']} {ing_data['unit']}"
                )
                
                total_cost += ing_line.total_cost
                db.add(ing_line)
                print(f"   ✅ {ing_data['name']}: {ing_data['quantity']} {ing_data['unit']} (${ing_line.total_cost:.2f})")
            
            # Actualizar costo total de la receta
            recipe.cost_per_batch = total_cost
            print(f"\n   💰 Costo total por platillo: ${total_cost:.2f}")
            print(f"   📊 Margen: ${platillo_product.price - total_cost:.2f}")
            
            db.commit()
            db.refresh(recipe)
            print(f"\n✅ Receta '{recipe.name}' creada exitosamente")
        
        # 5. Crear orden de producción
        print("\n🔧 PASO 4: Creando orden de producción...")
        
        # Verificar si ya existe
        existing_order = db.query(DBProductionOrder).filter(
            DBProductionOrder.company_id == company_id,
            DBProductionOrder.production_number == "PROD-001"
        ).first()
        
        if existing_order:
            print("   ⚠️  La orden PROD-001 ya existe")
        else:
            order = DBProductionOrder(
                company_id=company_id,
                recipe_id=recipe.id,
                production_number="PROD-001",
                production_date=datetime.now(),
                quantity_to_produce=10,
                quantity_produced=0,
                unit_of_measure="unidad",
                status="planned",
                cost_per_unit=recipe.cost_per_batch,
                total_cost=recipe.cost_per_batch * 10,
                notes="Orden de demostración - 10 unidades de Pollo al Horno",
                created_by=2,  # Admin user ID
                createdAt=datetime.now(),
                updatedAt=datetime.now()
            )
            
            db.add(order)
            db.flush()
            
            # Agregar consumo de ingredientes
            for ing_line in recipe.ingredients:
                consumption = DBProductionConsumption(
                    production_order_id=order.id,
                    ingredient_product_id=ing_line.ingredient_product_id,
                    quantity_required=ing_line.quantity * order.quantity_to_produce,
                    quantity_consumed=ing_line.quantity * order.quantity_to_produce,
                    unit_of_measure=ing_line.unit_of_measure,
                    unit_cost=ing_line.unit_cost,
                    total_cost=ing_line.quantity * order.quantity_to_produce * ing_line.unit_cost
                )
                db.add(consumption)
            
            db.commit()
            print(f"   ✅ Orden PROD-001 creada (Estado: Planificada)")
            print(f"   📦 Cantidad a producir: 10 unidades")
            print(f"   💰 Costo total: ${order.total_cost:.2f}")
        
        print("\n" + "=" * 80)
        print("✅ DATOS DE DEMOSTRACIÓN CREADOS EXITOSAMENTE")
        print("=" * 80)
        print("\n📋 RESUMEN:")
        print(f"   • Materias primas: {len(ingredient_products)} productos")
        print(f"   • Producto final: Pollo al Horno")
        print(f"   • Receta: {recipe.name} (Costo: ${recipe.cost_per_batch:.2f}/platillo)")
        print(f"   • Orden de producción: PROD-001 (10 unidades)")
        print("\n🚀 PRÓXIMOS PASOS:")
        print("   1. Ve a 'Órdenes de Producción'")
        print("   2. Haz clic en 'Iniciar Producción' en PROD-001")
        print("   3. Haz clic en 'Completar Producción' e ingresa la cantidad")
        print("   4. Verifica que el inventario se actualizó correctamente")
        print("   5. Ve al POS y factura el 'Pollo al Horno'")
        print("\n" + "=" * 80)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_demo_recipes()

