import { execFileSync } from 'node:child_process'

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

const semVerPattern = /^v\d+\.\d+\.\d+$/

const tagsOnCurrentCommit = git([
  'tag',
  '--points-at',
  'HEAD',
  '--list',
  'v*',
])
  .split(/\r?\n/)
  .filter((tag) => semVerPattern.test(tag))

if (tagsOnCurrentCommit.length > 0) {
  console.log(
    `Current commit already has tag ${tagsOnCurrentCommit[0]}. No new tag created.`,
  )
  process.exit(0)
}

const commitMessage = git(['log', '-1', '--pretty=%B'])
const commitHeader = commitMessage.split(/\r?\n/)[0].trim()

const existingTags = git([
  'tag',
  '--list',
  'v*',
  '--sort=-v:refname',
])
  .split(/\r?\n/)
  .filter((tag) => semVerPattern.test(tag))

const latestTag = existingTags[0] ?? 'v0.0.0'

const versionMatch = latestTag.match(/^v(\d+)\.(\d+)\.(\d+)$/)

if (!versionMatch) {
  throw new Error(`Invalid semantic version tag: ${latestTag}`)
}

let major = Number(versionMatch[1])
let minor = Number(versionMatch[2])
let patch = Number(versionMatch[3])

const isBreakingChange =
  /^[a-z][a-z0-9-]*(?:\([^)]+\))?!:/i.test(commitHeader) ||
  /^BREAKING[ -]CHANGE:\s/im.test(commitMessage)

const isFeature = /^feat(?:\([^)]+\))?:/i.test(commitHeader)
const isFix = /^fix(?:\([^)]+\))?:/i.test(commitHeader)

if (isBreakingChange) {
  major += 1
  minor = 0
  patch = 0
} else if (isFeature) {
  minor += 1
  patch = 0
} else if (isFix) {
  patch += 1
} else {
  console.log(
    `Commit "${commitHeader}" does not require a new semantic version.`,
  )
  process.exit(0)
}

const newTag = `v${major}.${minor}.${patch}`

git(['tag', newTag])

console.log(`Created tag ${newTag}`)