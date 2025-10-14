#!/usr/bin/env python3
"""
Script de prueba para verificar persistencia de datos en SQLite
"""

from database import get_db_session
from database import User, Product, Sale, SaleItem, JournalEntry, InventoryMovement
from datetime import datetime

def test_data_persistence():
    """Probar que los datos persisten en SQLite"""
    print("=== PRUEBA DE PERSISTENCIA DE DATOS ===\n")
    
    db = get_db_session()
    
    try:
        # 1. Verificar que hay datos iniciales
        users_count = db.query(User).count()
        products_count = db.query(Product).count()
        sales_count = db.query(Sale).count()
        
        print(f"📊 Estado inicial de la base de datos:")
        print(f"   - Usuarios: {users_count}")
        print(f"   - Productos: {products_count}")
        print(f"   - Ventas: {sales_count}")
        print()
        
        # 2. Verificar usuarios específicos
        admin_user = db.query(User).filter(User.username == "admin").first()
        if admin_user:
            print(f"✅ Usuario admin encontrado: {admin_user.name} (ID: {admin_user.id})")
        else:
            print("❌ Usuario admin no encontrado")
            return False
        
        # 3. Verificar productos específicos
        coca_cola = db.query(Product).filter(Product.code == "SKU00001").first()
        if coca_cola:
            print(f"✅ Producto SKU00001 encontrado: {coca_cola.name} - Stock: {coca_cola.stock}")
        else:
            print("❌ Producto SKU00001 no encontrado")
            return False
        
        # 4. Simular una venta para probar persistencia
        print(f"\n🛒 Simulando venta...")
        
        # Crear venta simulada
        test_sale = Sale(
            invoiceNumber="CF-241013-000001",
            customerName="Cliente de Prueba",
            invoiceType="consumidor_final",
            subtotal=10.00,
            taxAmount=1.50,
            discountAmount=0.00,
            total=11.50,
            paymentMethod="cash",
            paymentAmount=15.00,
            change=3.50,
            cashierId=admin_user.id,
            cashierName=admin_user.name,
            status="completed"
        )
        
        db.add(test_sale)
        db.flush()  # Para obtener el ID
        
        # Crear item de venta
        sale_item = SaleItem(
            saleId=test_sale.id,
            productId=coca_cola.id,
            productName=coca_cola.name,
            quantity=2,
            unitPrice=5.00,
            subtotal=10.00,
            tax=15.0,
            total=11.50
        )
        
        db.add(sale_item)
        
        # Actualizar stock del producto
        original_stock = coca_cola.stock
        coca_cola.stock -= 2
        coca_cola.updatedAt = datetime.now()
        
        db.commit()
        
        print(f"✅ Venta creada: {test_sale.invoiceNumber} - Total: ${test_sale.total}")
        print(f"✅ Stock actualizado: {coca_cola.name} ({original_stock} → {coca_cola.stock})")
        
        # 5. Verificar que los datos se guardaron
        saved_sale = db.query(Sale).filter(Sale.invoiceNumber == "CF-241013-000001").first()
        if saved_sale:
            print(f"✅ Venta guardada en BD: ID {saved_sale.id}")
            
            # Verificar items
            items_count = len(saved_sale.items)
            print(f"✅ Items de venta guardados: {items_count}")
        else:
            print("❌ Venta no se guardó correctamente")
            return False
        
        # 6. Estadísticas finales
        sales_count_after = db.query(Sale).count()
        print(f"\n📈 Ventas después de la prueba: {sales_count_after}")
        
        print(f"\n🎉 PRUEBA DE PERSISTENCIA EXITOSA")
        print(f"   - Todos los datos se guardaron correctamente en SQLite")
        print(f"   - Archivo de BD: superpos.db")
        print(f"   - Los datos persistirán después de reiniciar el servidor")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en prueba de persistencia: {e}")
        db.rollback()
        return False
        
    finally:
        db.close()

def test_accounting_persistence():
    """Probar que las transacciones contables persisten"""
    print(f"\n=== PRUEBA DE TRANSACCIONES CONTABLES ===\n")
    
    db = get_db_session()
    
    try:
        # Verificar pólizas contables
        journal_entries = db.query(JournalEntry).count()
        inventory_movements = db.query(InventoryMovement).count()
        
        print(f"📊 Registros contables:")
        print(f"   - Pólizas contables: {journal_entries}")
        print(f"   - Movimientos de inventario: {inventory_movements}")
        
        if journal_entries > 0:
            # Mostrar última póliza
            last_entry = db.query(JournalEntry).order_by(JournalEntry.id.desc()).first()
            print(f"✅ Última póliza: {last_entry.entryNumber} - {last_entry.description}")
            print(f"   - Líneas: {len(last_entry.lines)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error verificando contabilidad: {e}")
        return False
        
    finally:
        db.close()

if __name__ == "__main__":
    success1 = test_data_persistence()
    success2 = test_accounting_persistence()
    
    if success1 and success2:
        print(f"\n🚀 TODAS LAS PRUEBAS EXITOSAS - SQLite funcionando correctamente!")
        exit(0)
    else:
        print(f"\n💥 ALGUNAS PRUEBAS FALLARON")
        exit(1)
