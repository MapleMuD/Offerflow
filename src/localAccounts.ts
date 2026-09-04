import type { Application, CandidateProfile, OutreachRecord } from './types'

const ACCOUNTS_KEY = 'offerflow-local-accounts-v1'
const SESSION_KEY = 'offerflow-local-session-v1'
const DATA_PREFIX = 'offerflow-account-data-v1:'

export const LEGACY_APPLICATIONS_KEY = 'offerflow-applications-v1'
export const LEGACY_PROFILE_KEY = 'offerflow-profile-v2'
export const LEGACY_OUTREACH_KEY = 'offerflow-phd-outreach-v1'

interface StoredAccount {
  id: string
  username: string
  displayName: string
  salt: string
  passwordHash: string
  createdAt: string
}

export interface LocalAccount {
  id: string
  username: string
  displayName: string
  createdAt: string
}

export interface AccountData {
  profile: CandidateProfile
  applications: Application[]
  outreachRecords: OutreachRecord[]
}

function readAccounts(): StoredAccount[] {
  try {
    const value = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writeAccounts(accounts: StoredAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function toPublicAccount(account: StoredAccount): LocalAccount {
  const { passwordHash: _, salt: __, ...publicAccount } = account
  return publicAccount
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

async function hashPassword(password: string, salt: Uint8Array) {
  const source = new TextEncoder().encode(password)
  const key = await crypto.subtle.importKey('raw', source, 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: 120_000 },
    key,
    256,
  )
  return bytesToBase64(new Uint8Array(bits))
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase()
}

export function getCurrentAccount(): LocalAccount | null {
  const accountId = localStorage.getItem(SESSION_KEY)
  if (!accountId) return null
  const account = readAccounts().find(item => item.id === accountId)
  if (!account) {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
  return toPublicAccount(account)
}

export function getLocalAccountCount() {
  return readAccounts().length
}

export function hasLegacyData() {
  return Boolean(
    localStorage.getItem(LEGACY_APPLICATIONS_KEY)
    || localStorage.getItem(LEGACY_PROFILE_KEY)
    || localStorage.getItem(LEGACY_OUTREACH_KEY),
  )
}

export async function registerLocalAccount(
  username: string,
  displayName: string,
  password: string,
  initialData: AccountData,
) {
  const normalized = normalizeUsername(username)
  if (!/^[a-z0-9_\u4e00-\u9fff]{3,24}$/i.test(normalized)) throw new Error('账号需为 3–24 位中文、字母、数字或下划线')
  if (password.length < 6) throw new Error('密码至少需要 6 位')
  const accounts = readAccounts()
  if (accounts.some(account => normalizeUsername(account.username) === normalized)) throw new Error('该账号已在本机注册')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const account: StoredAccount = {
    id: crypto.randomUUID(),
    username: normalized,
    displayName: displayName.trim() || normalized,
    salt: bytesToBase64(salt),
    passwordHash: await hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  }
  writeAccounts([...accounts, account])
  saveAccountData(account.id, initialData)
  localStorage.setItem(SESSION_KEY, account.id)
  return toPublicAccount(account)
}

export async function loginLocalAccount(username: string, password: string) {
  const account = readAccounts().find(item => normalizeUsername(item.username) === normalizeUsername(username))
  if (!account) throw new Error('本机没有这个账号')
  const candidate = await hashPassword(password, base64ToBytes(account.salt))
  if (candidate !== account.passwordHash) throw new Error('密码不正确')
  localStorage.setItem(SESSION_KEY, account.id)
  return toPublicAccount(account)
}

export function logoutLocalAccount() {
  localStorage.removeItem(SESSION_KEY)
}

export async function changeLocalPassword(accountId: string, currentPassword: string, nextPassword: string) {
  if (nextPassword.length < 6) throw new Error('新密码至少需要 6 位')
  const accounts = readAccounts()
  const account = accounts.find(item => item.id === accountId)
  if (!account) throw new Error('账号不存在')
  const currentHash = await hashPassword(currentPassword, base64ToBytes(account.salt))
  if (currentHash !== account.passwordHash) throw new Error('当前密码不正确')
  const nextSalt = crypto.getRandomValues(new Uint8Array(16))
  account.salt = bytesToBase64(nextSalt)
  account.passwordHash = await hashPassword(nextPassword, nextSalt)
  writeAccounts(accounts)
}

export async function deleteLocalAccount(accountId: string, password: string) {
  const accounts = readAccounts()
  const account = accounts.find(item => item.id === accountId)
  if (!account) throw new Error('账号不存在')
  const candidate = await hashPassword(password, base64ToBytes(account.salt))
  if (candidate !== account.passwordHash) throw new Error('密码不正确')
  writeAccounts(accounts.filter(item => item.id !== accountId))
  localStorage.removeItem(`${DATA_PREFIX}${accountId}`)
  localStorage.removeItem(SESSION_KEY)
}

export function loadAccountData(accountId: string, fallback: AccountData): AccountData {
  try {
    const value = JSON.parse(localStorage.getItem(`${DATA_PREFIX}${accountId}`) || 'null')
    if (!value || !value.profile || !Array.isArray(value.applications) || !Array.isArray(value.outreachRecords)) return fallback
    return value as AccountData
  } catch {
    return fallback
  }
}

export function saveAccountData(accountId: string, data: AccountData) {
  localStorage.setItem(`${DATA_PREFIX}${accountId}`, JSON.stringify({ ...data, savedAt: new Date().toISOString() }))
}

