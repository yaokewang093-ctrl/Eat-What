/**
 * This is a API server
 */

import dotenv from 'dotenv'
dotenv.config()

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth'
import searchRoutes from './routes/search'
import restaurantRoutes from './routes/restaurants'
import reviewRoutes from './routes/reviews'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
// 适配 Netlify 的路由：同时支持带 /api 和不带 /api 的路径
app.use('/api/auth', authRoutes)
app.use('/auth', authRoutes)

app.use('/api/search', searchRoutes)
app.use('/search', searchRoutes)

app.use('/api/restaurants', restaurantRoutes)
app.use('/restaurants', restaurantRoutes)

app.use('/api/reviews', reviewRoutes)
app.use('/reviews', reviewRoutes)

// 新增诊断接口：检查环境变量是否加载
app.get('/api/debug', (req, res) => {
  res.json({
    has_amap_key: !!process.env.VITE_AMAP_KEY,
    amap_key_prefix: process.env.VITE_AMAP_KEY ? process.env.VITE_AMAP_KEY.substring(0, 4) : 'none',
    has_supabase_url: !!process.env.VITE_SUPABASE_URL,
    env_keys: Object.keys(process.env).filter(k => k.includes('VITE') || k.includes('SUPABASE'))
  });
});

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
