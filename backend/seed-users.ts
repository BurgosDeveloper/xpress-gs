import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding users...');
  
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gs.com' },
    update: {},
    create: {
      email: 'admin@gs.com',
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log('Admin created:', admin.email);

  // 2. Cliente
  const cliente = await prisma.user.upsert({
    where: { email: 'cliente@gs.com' },
    update: {},
    create: {
      email: 'cliente@gs.com',
      username: 'cliente',
      passwordHash,
      role: 'USER',
      passenger: {
        create: {
          fullName: 'Cliente de Prueba',
          phone: '+584141234567',
        }
      },
      creditAccount: {
        create: {
          balanceCop: 0
        }
      }
    },
  });
  console.log('Cliente created:', cliente.email);

  // 3. Ejecutivo (Driver)
  const ejecutivo = await prisma.user.upsert({
    where: { email: 'ejecutivo@gs.com' },
    update: {},
    create: {
      email: 'ejecutivo@gs.com',
      username: 'ejecutivo',
      passwordHash,
      role: 'DRIVER',
      driver: {
        create: {
          fullName: 'Ejecutivo de Prueba',
          phone: '+584147654321',
          photoUrl: 'https://via.placeholder.com/150',
          serviceType: 'CARRO',
          status: 'APPROVED',
          isAvailable: true,
          vehicle: {
            create: {
              brand: 'Toyota',
              model: 'Corolla',
              year: 2020,
              color: 'Blanco',
              plate: 'ABC-123'
            }
          }
        }
      },
      creditAccount: {
        create: {
          balanceCop: 100000 // Para que pueda recibir carreras
        }
      }
    },
  });
  console.log('Ejecutivo created:', ejecutivo.email);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
