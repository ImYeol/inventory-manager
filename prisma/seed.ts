import 'dotenv/config'
import fs from 'fs'
import path from 'path'

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.')
}

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter })

const seedUserId = process.env.SEED_USER_ID?.trim()
const seedUserEmail = process.env.SEED_USER_EMAIL?.trim() || null
const dataPath = path.join(process.cwd(), 'extracted_data.json')

type WarehouseValue = 'OGEUMDONG' | 'DAEJADONG'
type TransactionTypeValue = 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT'

const colorInfoMap: Record<string, { rgb: string; textWhite: boolean }> = {
  '블랙': { rgb: '#000000', textWhite: true },
  '네이비': { rgb: '#000080', textWhite: true },
  '브라운': { rgb: '#654321', textWhite: true },
  '그린': { rgb: '#228B22', textWhite: true },
  '그레이': { rgb: '#808080', textWhite: false },
  '화이트': { rgb: '#FFFFFF', textWhite: false },
  '아이보리': { rgb: '#FFFFF0', textWhite: false },
  '베이지': { rgb: '#DEC6A0', textWhite: false },
  '핑크': { rgb: '#FFC0CB', textWhite: false },
  '다크그레이': { rgb: '#404040', textWhite: true },
  '라이트그레이': { rgb: '#B4B4B4', textWhite: false },
  '올리브카키': { rgb: '#6B8E23', textWhite: false },
  '딥카키': { rgb: '#556B2F', textWhite: true },
  '크림아이보리': { rgb: '#FFFDD0', textWhite: false },
  '오트밀베이지': { rgb: '#D2BE96', textWhite: false },
  '메탈릭골드': { rgb: '#B8860B', textWhite: false },
  '메탈릭그레이': { rgb: '#708090', textWhite: true },
  '다크그린': { rgb: '#006400', textWhite: true },
  '베이지그레이': { rgb: '#BCB8B1', textWhite: false },
  '딥레드와인': { rgb: '#722F37', textWhite: true },
  '라벤더그레이': { rgb: '#B4B0C3', textWhite: false },
  '심플블랙': { rgb: '#1E1E1E', textWhite: true },
  '심플브라운': { rgb: '#5A3C1E', textWhite: true },
  '심플네이비': { rgb: '#141464', textWhite: true },
  '심플그린': { rgb: '#287828', textWhite: true },
  '딥그린': { rgb: '#005000', textWhite: true },
  '블루': { rgb: '#0000CD', textWhite: true },
  '비비드블랙': { rgb: '#0A0A0A', textWhite: true },
  '비비드브라운': { rgb: '#5C3317', textWhite: true },
  '가로형그레이': { rgb: '#909090', textWhite: false },
  '에메랄드그린': { rgb: '#50C878', textWhite: false },
  '차콜그레이': { rgb: '#36454F', textWhite: true },
  '다크브라운': { rgb: '#3B2F2F', textWhite: true },
  '쿨그레이': { rgb: '#9BA4B4', textWhite: false },
}

function getColorInfo(name: string) {
  if (colorInfoMap[name]) return colorInfoMap[name]
  if (
    name.startsWith('다크') ||
    name.startsWith('딥') ||
    name.startsWith('심플') ||
    name.startsWith('차콜')
  ) {
    return { rgb: '#555555', textWhite: true }
  }
  if (
    name.startsWith('라이트') ||
    name.startsWith('크림') ||
    name.startsWith('오트밀')
  ) {
    return { rgb: '#CCCCCC', textWhite: false }
  }
  return { rgb: '#888888', textWhite: false }
}

function normalizeSizeName(value: string) {
  return value.replace(/(\d+)\.(\d+)/g, '$1$2')
}

function parseWarehouse(value: string): WarehouseValue {
  switch (value.trim()) {
    case '오금동':
    case 'OGEUMDONG':
      return 'OGEUMDONG'
    case '대자동':
    case 'DAEJADONG':
      return 'DAEJADONG'
    default:
      throw new Error(`Unknown warehouse value: ${value}`)
  }
}

function parseTransactionType(value: string): TransactionTypeValue {
  switch (value.trim()) {
    case '입고':
    case 'INBOUND':
      return 'INBOUND'
    case '반출':
    case '출고':
    case 'OUTBOUND':
      return 'OUTBOUND'
    case '조정':
    case 'ADJUSTMENT':
      return 'ADJUSTMENT'
    default:
      throw new Error(`Unknown transaction type: ${value}`)
  }
}

async function ensureSeedUserExists(userId: string, email: string | null) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    select exists (
      select 1
      from auth.users
      where id = ${userId}::uuid
    ) as exists
  `

  if (!rows[0]?.exists) {
    throw new Error(
      `SEED_USER_ID ${userId} does not exist in auth.users. Create a Supabase Auth user first.`
    )
  }

  await prisma.$executeRaw`
    insert into public.app_users (id, email)
    values (${userId}::uuid, ${email})
    on conflict (id) do update
      set email = coalesce(excluded.email, public.app_users.email)
  `
}

async function clearUserData(userId: string) {
  await prisma.transaction.deleteMany({ where: { userId } })
  await prisma.inventory.deleteMany({ where: { userId } })
  await prisma.shippingProviderCredential.deleteMany({ where: { userId } })
  await prisma.color.deleteMany({ where: { userId } })
  await prisma.size.deleteMany({ where: { userId } })
  await prisma.model.deleteMany({ where: { userId } })
}

async function main() {
  if (!seedUserId) {
    throw new Error('SEED_USER_ID is required.')
  }

  if (!fs.existsSync(dataPath)) {
    throw new Error(`Seed data file not found: ${dataPath}`)
  }

  const raw = fs.readFileSync(dataPath, 'utf8')
  const data = JSON.parse(raw) as {
    models: Array<{
      name: string
      sizes: string[]
      colors: string[]
      inventory: Array<{
        color: string
        ogeumdog: Record<string, number>
        daejadong: Record<string, number>
      }>
    }>
    transactions: Array<{
      date: string
      model: string
      size: string
      color: string
      type: string
      quantity: number
      warehouse: string
    }>
  }

  await ensureSeedUserExists(seedUserId, seedUserEmail)
  await clearUserData(seedUserId)

  const modelMap = new Map<string, bigint>()
  const sizeMap = new Map<string, Map<string, bigint>>()
  const colorMap = new Map<string, Map<string, bigint>>()

  for (const modelData of data.models) {
    const model = await prisma.model.create({
      data: {
        userId: seedUserId,
        name: modelData.name,
      },
    })

    modelMap.set(model.name, model.id)
    sizeMap.set(model.name, new Map())
    colorMap.set(model.name, new Map())

    const uniqueSizes: string[] = []
    const seenSizes = new Set<string>()
    for (const sizeName of modelData.sizes) {
      if (!seenSizes.has(sizeName)) {
        seenSizes.add(sizeName)
        uniqueSizes.push(sizeName)
      }
    }

    for (const [index, sizeName] of uniqueSizes.entries()) {
      const size = await prisma.size.create({
        data: {
          userId: seedUserId,
          modelId: model.id,
          name: sizeName,
          sortOrder: index,
        },
      })
      sizeMap.get(model.name)!.set(size.name, size.id)
    }

    for (const [index, colorName] of modelData.colors.entries()) {
      const info = getColorInfo(colorName)
      const color = await prisma.color.create({
        data: {
          userId: seedUserId,
          modelId: model.id,
          name: colorName,
          rgbCode: info.rgb,
          textWhite: info.textWhite,
          sortOrder: index,
        },
      })
      colorMap.get(model.name)!.set(color.name, color.id)
    }

    const modelSizes = sizeMap.get(model.name)!
    const modelColors = colorMap.get(model.name)!

    for (const item of modelData.inventory) {
      const colorId = modelColors.get(item.color)
      if (!colorId) continue

      for (const [sizeName, sizeId] of modelSizes) {
        const ogeumQty = item.ogeumdog[sizeName] ?? 0
        const daejaQty = item.daejadong[sizeName] ?? 0

        await prisma.inventory.create({
          data: {
            userId: seedUserId,
            modelId: model.id,
            sizeId,
            colorId,
            warehouse: 'OGEUMDONG',
            quantity: ogeumQty,
          },
        })

        await prisma.inventory.create({
          data: {
            userId: seedUserId,
            modelId: model.id,
            sizeId,
            colorId,
            warehouse: 'DAEJADONG',
            quantity: daejaQty,
          },
        })
      }
    }
  }

  let skippedTransactions = 0
  for (const tx of data.transactions) {
    const modelId = modelMap.get(tx.model)
    const modelSizes = sizeMap.get(tx.model)
    const modelColors = colorMap.get(tx.model)

    if (!modelId || !modelSizes || !modelColors) {
      skippedTransactions += 1
      continue
    }

    let sizeId = modelSizes.get(tx.size)
    if (!sizeId) {
      const normalizedTxSize = normalizeSizeName(tx.size)
      for (const [sizeName, candidateId] of modelSizes) {
        if (normalizeSizeName(sizeName) === normalizedTxSize) {
          sizeId = candidateId
          break
        }
      }
      if (!sizeId && tx.size === '단일사이즈') {
        for (const [sizeName, candidateId] of modelSizes) {
          if (sizeName.startsWith('단일')) {
            sizeId = candidateId
            break
          }
        }
      }
    }

    const colorId = modelColors.get(tx.color)
    if (!sizeId || !colorId) {
      skippedTransactions += 1
      continue
    }

    await prisma.transaction.create({
      data: {
        userId: seedUserId,
        date: new Date(tx.date),
        modelId,
        sizeId,
        colorId,
        type: parseTransactionType(tx.type),
        quantity: tx.quantity,
        warehouse: parseWarehouse(tx.warehouse),
      },
    })
  }

  const [modelCount, inventoryCount, transactionCount] = await Promise.all([
    prisma.model.count({ where: { userId: seedUserId } }),
    prisma.inventory.count({ where: { userId: seedUserId } }),
    prisma.transaction.count({ where: { userId: seedUserId } }),
  ])

  console.log(
    JSON.stringify(
      {
        seedUserId,
        models: modelCount,
        inventory: inventoryCount,
        transactions: transactionCount,
        skippedTransactions,
      },
      null,
      2
    )
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
