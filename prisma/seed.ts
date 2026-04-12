import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'

const dbPath = path.join(process.cwd(), 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

// Color RGB mapping
const colorMap: Record<string, { rgb: string; textWhite: boolean }> = {
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

function getColorInfo(name: string): { rgb: string; textWhite: boolean } {
  if (colorMap[name]) return colorMap[name]
  // Fallback heuristics
  if (name.startsWith('다크') || name.startsWith('딥') || name.startsWith('심플') || name.startsWith('차콜')) {
    return { rgb: '#555555', textWhite: true }
  }
  if (name.startsWith('라이트') || name.startsWith('크림') || name.startsWith('오트밀')) {
    return { rgb: '#CCCCCC', textWhite: false }
  }
  return { rgb: '#888888', textWhite: false }
}

// Best-effort size matching: normalize by removing dots from numbers
function normalizeSizeName(s: string): string {
  // "13.3인치(M)" -> "133인치(M)", "단일사이즈" -> "단일사이즈"
  return s.replace(/(\d+)\.(\d+)/g, '$1$2')
}

async function main() {
  const dataPath = path.join(process.cwd(), 'extracted_data.json')
  const raw = fs.readFileSync(dataPath, 'utf-8')
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

  console.log('Clearing existing data...')
  await prisma.transaction.deleteMany()
  await prisma.inventory.deleteMany()
  await prisma.color.deleteMany()
  await prisma.size.deleteMany()
  await prisma.model.deleteMany()

  console.log(`Seeding ${data.models.length} models...`)

  // Maps for transaction lookup
  const modelMap = new Map<string, number>()
  const sizeMap = new Map<string, Map<string, number>>() // modelName -> sizeName -> sizeId
  const colorMap2 = new Map<string, Map<string, number>>() // modelName -> colorName -> colorId

  for (const modelData of data.models) {
    const model = await prisma.model.create({
      data: { name: modelData.name },
    })
    modelMap.set(model.name, model.id)
    sizeMap.set(model.name, new Map())
    colorMap2.set(model.name, new Map())

    // Deduplicate sizes, preserving order
    const uniqueSizes: string[] = []
    const seenSizes = new Set<string>()
    for (const s of modelData.sizes) {
      if (!seenSizes.has(s)) {
        seenSizes.add(s)
        uniqueSizes.push(s)
      }
    }

    // Create sizes
    for (let i = 0; i < uniqueSizes.length; i++) {
      const size = await prisma.size.create({
        data: {
          name: uniqueSizes[i],
          sortOrder: i,
          modelId: model.id,
        },
      })
      sizeMap.get(model.name)!.set(size.name, size.id)
    }

    // Create colors
    for (let i = 0; i < modelData.colors.length; i++) {
      const cName = modelData.colors[i]
      const cInfo = getColorInfo(cName)
      const color = await prisma.color.create({
        data: {
          name: cName,
          rgbCode: cInfo.rgb,
          textWhite: cInfo.textWhite,
          sortOrder: i,
          modelId: model.id,
        },
      })
      colorMap2.get(model.name)!.set(color.name, color.id)
    }

    // Create inventory records for both warehouses
    const modelSizes = sizeMap.get(model.name)!
    const modelColors = colorMap2.get(model.name)!

    for (const invItem of modelData.inventory) {
      const colorId = modelColors.get(invItem.color)
      if (!colorId) {
        console.warn(`Color not found: ${invItem.color} in model ${model.name}`)
        continue
      }

      for (const [sizeName, sizeId] of modelSizes) {
        const ogeumQty = invItem.ogeumdog[sizeName] ?? 0
        const daejaQty = invItem.daejadong[sizeName] ?? 0

        await prisma.inventory.create({
          data: {
            modelId: model.id,
            sizeId,
            colorId,
            warehouse: '오금동',
            quantity: ogeumQty,
          },
        })
        await prisma.inventory.create({
          data: {
            modelId: model.id,
            sizeId,
            colorId,
            warehouse: '대자동',
            quantity: daejaQty,
          },
        })
      }
    }
  }

  console.log(`Seeding ${data.transactions.length} transactions...`)

  let skipped = 0
  for (const tx of data.transactions) {
    const modelId = modelMap.get(tx.model)
    if (!modelId) {
      console.warn(`Transaction model not found: ${tx.model}`)
      skipped++
      continue
    }

    const modelSizes = sizeMap.get(tx.model)!
    const modelColors = colorMap2.get(tx.model)!

    // Find sizeId - exact match first, then normalized match
    let sizeId = modelSizes.get(tx.size)
    if (!sizeId) {
      const normalizedTx = normalizeSizeName(tx.size)
      for (const [sName, sId] of modelSizes) {
        if (normalizeSizeName(sName) === normalizedTx) {
          sizeId = sId
          break
        }
      }
      // Also try matching "단일사이즈" to "단일"
      if (!sizeId && tx.size === '단일사이즈') {
        for (const [sName, sId] of modelSizes) {
          if (sName.startsWith('단일')) {
            sizeId = sId
            break
          }
        }
      }
    }

    const colorId = modelColors.get(tx.color)

    if (!sizeId || !colorId) {
      console.warn(`Transaction lookup failed: model=${tx.model} size=${tx.size}(${sizeId ? 'ok' : 'NOT FOUND'}) color=${tx.color}(${colorId ? 'ok' : 'NOT FOUND'})`)
      skipped++
      continue
    }

    await prisma.transaction.create({
      data: {
        date: tx.date,
        modelId,
        sizeId,
        colorId,
        type: tx.type,
        quantity: tx.quantity,
        warehouse: tx.warehouse,
      },
    })
  }

  console.log(`Done! Skipped ${skipped} transactions.`)
  const modelCount = await prisma.model.count()
  const invCount = await prisma.inventory.count()
  const txCount = await prisma.transaction.count()
  console.log(`Final counts - Models: ${modelCount}, Inventory: ${invCount}, Transactions: ${txCount}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
