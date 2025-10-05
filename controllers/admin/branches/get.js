const mongoose = require('mongoose')
const BranchModel = require('../../../models/branches.models')

async function getBranches(query = {}) {
  let {
    page = 1,
    perPage,
    limit,
    q,
    sortBy = 'name',
    order = 'asc',
    name,
    type,
    city,
    state,
    country,
    email,
    isActive,
    isDeliveryAvailable,
    productId,
    minTotalStocks,
    maxTotalStocks
  } = query

  page = parseInt(page) || 1
  let size = parseInt(perPage || limit) || 10
  size = Math.min(200, Math.max(1, size))

  const filter = {}

  if (q) {
    const re = new RegExp(q.trim(), 'i')
    filter.$or = [
      { name: re },
      { 'address.city': re },
      { 'address.state': re },
      { 'address.country': re },
      { 'address.streetAddress': re },
      { email: re },
      { 'phone.primary': re },
      { 'phone.secondary': re }
    ]
  }

  if (name) filter.name = new RegExp(name.trim(), 'i')
  if (type) filter.type = type.trim()
  if (city) filter['address.city'] = new RegExp(city.trim(), 'i')
  if (state) filter['address.state'] = new RegExp(state.trim(), 'i')
  if (country) filter['address.country'] = new RegExp(country.trim(), 'i')
  if (email) filter.email = new RegExp(email.trim(), 'i')

  if (isActive !== undefined) filter.isActive = isActive === true || isActive === 'true' || isActive === '1'
  if (isDeliveryAvailable !== undefined) filter.isDeliveryAvailable = isDeliveryAvailable === true || isDeliveryAvailable === 'true' || isDeliveryAvailable === '1'

  if (productId) {
    if (mongoose.isValidObjectId(productId)) {
      filter['stock.products.productId'] = mongoose.Types.ObjectId(productId)
    }
  }

  if (minTotalStocks || maxTotalStocks) {
    filter['stock.totalStocks'] = {}
    if (minTotalStocks) filter['stock.totalStocks'].$gte = Number(minTotalStocks)
    if (maxTotalStocks) filter['stock.totalStocks'].$lte = Number(maxTotalStocks)
  }

  const sortObj = { [sortBy]: order.toLowerCase() === 'desc' ? -1 : 1 }

  const skip = (page - 1) * size

  const [total, data] = await Promise.all([
    BranchModel.countDocuments(filter),
    BranchModel.find(filter).sort(sortObj).skip(skip).limit(size).lean()
  ])

  return {
    data,
    page,
    perPage: size,
    total,
    totalPages: Math.ceil(total / size) || 1
  }
}

async function getBranchById(id) {
  if (!mongoose.isValidObjectId(String(id))) return null
  const branch = await BranchModel.findById(String(id)).lean()
  return branch || null
}

async function listings(query = {}) {
  let { page = 1, perPage, limit, q, sortBy = 'name', order = 'asc', type, isActive } = query
  page = parseInt(page) || 1
  let size = parseInt(perPage || limit) || 10
  size = Math.min(200, Math.max(1, size))
  const filter = {}
  if (q) {
    const re = new RegExp(String(q).trim(), 'i')
    filter.$or = [
      { name: re },
      { 'address.city': re },
      { 'address.state': re },
      { 'address.country': re }
    ]
  }
  if (type) filter.type = type.trim()
  if (isActive !== undefined) filter.isActive = isActive === true || isActive === 'true' || isActive === '1'
  const sortObj = { [sortBy]: order.toLowerCase() === 'desc' ? -1 : 1 }
  const skip = (page - 1) * size
  const projection = { name: 1, type: 1, isActive: 1, 'address.city': 1 }
  const [total, data] = await Promise.all([
    BranchModel.countDocuments(filter),
    BranchModel.find(filter).select(projection).sort(sortObj).skip(skip).limit(size).lean()
  ])
  const items = (data || []).map((b) => ({
    _id: b._id,
    name: b.name || '',
    type: b.type || '',
    city: (b.address && b.address.city) || '',
    isActive: typeof b.isActive === 'boolean' ? b.isActive : true
  }))
  return {
    data: items,
    page,
    perPage: size,
    total,
    totalPages: Math.ceil(total / size) || 1
  }
}

module.exports = { getBranches, getBranchById, listings }