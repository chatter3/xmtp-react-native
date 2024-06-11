import { Test, assert, createClients } from './test-utils'

export const groupPermissionsTests: Test[] = []
let counter = 1
function test(name: string, perform: () => Promise<boolean>) {
  groupPermissionsTests.push({
    name: String(counter++) + '. ' + name,
    run: perform,
  })
}

test('new group has expected admin list and super admin list', async () => {
  // Create clients
  const [alix, bo] = await createClients(2)

  // Alix Create a group
  const alixGroup = await alix.conversations.newGroup([bo.address])

  // Alix is the only admin and the only super admin
  const adminList = await alixGroup.listAdmins()
  const superAdminList = await alixGroup.listSuperAdmins()

  assert(
    adminList.length === 1,
    `adminList.length should be 1 but was ${adminList.length}`
  )
  assert(
    adminList[0] === alix.inboxId,
    `adminList[0] should be ${alix.address} but was ${adminList[0]}`
  )
  assert(
    superAdminList.length === 1,
    `superAdminList.length should be 1 but was ${superAdminList.length}`
  )
  assert(
    superAdminList[0] === alix.inboxId,
    `superAdminList[0] should be ${alix.address} but was ${superAdminList[0]}`
  )
  return true
})

test('super admin can add a new admin', async () => {
  // Create clients
  const [alix, bo, caro] = await createClients(3)

  // Alix Create a group
  const alixGroup = await alix.conversations.newGroup([
    bo.address,
    caro.address,
  ])

  // Verify alix is a super admin and bo is not
  const alixIsSuperAdmin = await alixGroup.isSuperAdmin(alix.inboxId)
  const boIsSuperAdmin = await alixGroup.isSuperAdmin(bo.inboxId)

  assert(alixIsSuperAdmin, `alix should be a super admin`)
  assert(!boIsSuperAdmin, `bo should not be a super admin`)

  // Verify that bo can not add a new admin
  await bo.conversations.syncGroups()
  const boGroup = (await bo.conversations.listGroups())[0]
  try {
    await boGroup.addAdmin(caro.inboxId)
    throw new Error(
      'Expected exception when non-super admin attempts to add an admin.'
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // expected
  }

  // Alix adds bo as an admin
  await alixGroup.addAdmin(bo.inboxId)
  await alix.conversations.syncGroups()
  const alixGroupIsAdmin = await alixGroup.isAdmin(bo.inboxId)
  assert(alixGroupIsAdmin, `alix should be an admin`)

  return true
})

test('in admin only group, members can not update group name unless they are an admin', async () => {
  // Create clients
  const [alix, bo, caro] = await createClients(3)

  // Alix Create a group
  const alixGroup = await alix.conversations.newGroup(
    [bo.address, caro.address],
    'admin_only'
  )

  if (alixGroup.permissionLevel !== 'admin_only') {
    throw Error(
      `Group permission level should be admin_only but was ${alixGroup.permissionLevel}`
    )
  }

  // Verify group name is empty string
  const groupName = await alixGroup.groupName()
  assert(
    groupName === '',
    `group name should be empty string but was ${groupName}`
  )

  // Verify that bo can not update the group name
  await bo.conversations.syncGroups()
  const boGroup = (await bo.conversations.listGroups())[0]
  try {
    await boGroup.updateGroupName("bo's group")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return true
  }
  return false
})

test('in admin only group, members can update group name once they are an admin', async () => {
  // Create clients
  const [alix, bo, caro] = await createClients(3)

  // Alix Create a group
  const alixGroup = await alix.conversations.newGroup(
    [bo.address, caro.address],
    'admin_only'
  )

  if (alixGroup.permissionLevel !== 'admin_only') {
    throw Error(
      `Group permission level should be admin_only but was ${alixGroup.permissionLevel}`
    )
  }

  // Verify group name is empty string
  let groupName = await alixGroup.groupName()
  assert(
    groupName === '',
    `group name should be empty string but was ${groupName}`
  )

  // Verify that bo can not update the group name
  await bo.conversations.syncGroups()
  const boGroup = (await bo.conversations.listGroups())[0]
  try {
    await boGroup.updateGroupName("bo's group")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // expected
  }

  // Alix adds bo as an admin
  await alixGroup.addAdmin(bo.inboxId)
  await alix.conversations.syncGroups()
  const alixGroupIsAdmin = await alixGroup.isAdmin(bo.inboxId)
  assert(alixGroupIsAdmin, `alix should be an admin`)

  // Now bo can update the group name
  await boGroup.sync()
  await boGroup.updateGroupName("bo's group")
  groupName = await boGroup.groupName()
  assert(
    groupName === "bo's group",
    `group name should be bo's group but was ${groupName}`
  )

  return true
})

test('in admin only group, members can not update group name after admin status is removed', async () => {
  // Create clients
  const [alix, bo, caro] = await createClients(3)

  // Alix Create a group
  const alixGroup = await alix.conversations.newGroup(
    [bo.address, caro.address],
    'admin_only'
  )

  if (alixGroup.permissionLevel !== 'admin_only') {
    throw Error(
      `Group permission level should be admin_only but was ${alixGroup.permissionLevel}`
    )
  }

  // Verify group name is empty string
  let groupName = await alixGroup.groupName()
  assert(
    groupName === '',
    `group name should be empty string but was ${groupName}`
  )

  // Alix adds bo as an admin
  await alixGroup.addAdmin(bo.inboxId)
  await alix.conversations.syncGroups()
  let boIsAdmin = await alixGroup.isAdmin(bo.inboxId)
  assert(boIsAdmin, `bo should be an admin`)

  // Now bo can update the group name
  await bo.conversations.syncGroups()
  const boGroup = (await bo.conversations.listGroups())[0]
  await boGroup.sync()
  await boGroup.updateGroupName("bo's group")
  await alixGroup.sync()
  groupName = await alixGroup.groupName()
  assert(
    groupName === "bo's group",
    `group name should be bo's group but was ${groupName}`
  )

  // Now alix removed bo as an admin
  await alixGroup.removeAdmin(bo.inboxId)
  await alix.conversations.syncGroups()
  boIsAdmin = await alixGroup.isAdmin(bo.inboxId)
  assert(!boIsAdmin, `bo should not be an admin`)

  // Bo can no longer update the group name
  try {
    await boGroup.updateGroupName('new name 2')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // expected error
  }

  await alixGroup.sync()
  groupName = await alixGroup.groupName()
  assert(
    groupName === "bo's group",
    `group name should be bo's group but was ${groupName}`
  )

  // throw new Error('Expected exception when non-admin attempts to update group name.')
  return true
})

test('can not remove a super admin from a group', async () => {
  // Create clients
  const [alix, bo] = await createClients(3)

  // Alix Create a group
  const alixGroup = await alix.conversations.newGroup(
    [bo.address],
    'all_members'
  )

  let alixIsSuperAdmin = await alixGroup.isSuperAdmin(alix.inboxId)
  let boIsSuperAdmin = await alixGroup.isSuperAdmin(bo.inboxId)
  let numMembers = (await alixGroup.memberInboxIds()).length
  assert(alixIsSuperAdmin, `alix should be a super admin`)
  assert(!boIsSuperAdmin, `bo should not be a super admin`)
  assert(
    numMembers === 2,
    `number of members should be 2 but was ${numMembers}`
  )

  await bo.conversations.syncGroups()
  const boGroup = (await bo.conversations.listGroups())[0]
  await boGroup.sync()

  // Bo should not be able to remove alix from the group
  try {
    await boGroup.removeMembersByInboxId([alix.inboxId])
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // expected
  }

  await boGroup.sync()
  numMembers = (await alixGroup.memberInboxIds()).length
  assert(alixIsSuperAdmin, `alix should be a super admin`)
  assert(!boIsSuperAdmin, `bo should not be a super admin`)
  assert(
    numMembers === 2,
    `number of members should be 2 but was ${numMembers}`
  )

  // Alix adds bo as a super admin
  await alixGroup.addSuperAdmin(bo.inboxId)
  await alixGroup.sync()
  boIsSuperAdmin = await alixGroup.isSuperAdmin(bo.inboxId)
  assert(boIsSuperAdmin, `bo should be a super admin`)
  await boGroup.sync()
  boIsSuperAdmin = await boGroup.isSuperAdmin(bo.inboxId)
  assert(boIsSuperAdmin, `bo should be a super admin`)

  // Verify bo can not remove alix bc alix is a super admin
  try {
    await boGroup.removeMembersByInboxId([alix.inboxId])
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // expected
  }
  await boGroup.sync()
  await alixGroup.sync()
  numMembers = (await alixGroup.memberInboxIds()).length
  assert(
    numMembers === 2,
    `number of members should be 2 but was ${numMembers}`
  )

  // Bo can remove alix as a super admin
  await boGroup.sync()
  await boGroup.removeSuperAdmin(alix.inboxId)
  await boGroup.sync()
  await alixGroup.sync()
  alixIsSuperAdmin = await alixGroup.isSuperAdmin(alix.inboxId)
  assert(!alixIsSuperAdmin, `alix should not be a super admin`)

  // Now bo can remove Alix from the group
  await boGroup.removeMembers([alix.address])
  console.log('alix inbox id:' + String(alix.inboxId))
  await boGroup.sync()
  numMembers = (await boGroup.memberInboxIds()).length
  assert(
    numMembers === 1,
    `number of members should be 1 but was ${numMembers}`
  )

  return true
})

test('can commit after invalid permissions commit', async () => {
  // Create clients
  const [alix, bo, caro] = await createClients(3)

  // Bo creates a group with Alix and Caro
  const boGroup = await bo.conversations.newGroup(
    [alix.address, caro.address],
    'all_members'
  )
  await alix.conversations.syncGroups()
  const alixGroup = (await alix.conversations.listGroups())[0]

  // Verify that Alix cannot add an admin
  assert(
    (await boGroup.groupName()) === '',
    `boGroup.groupName should be empty string but was ${boGroup.groupName}`
  )
  try {
    await alixGroup.addAdmin(alix.inboxId)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // expected
  }

  await alixGroup.sync()
  await boGroup.sync()

  // Verify that Alix can update the group name
  await boGroup.sync()
  await alixGroup.sync()
  await alixGroup.updateGroupName('Alix group name')
  await alixGroup.sync()
  await boGroup.sync()
  assert(
    (await boGroup.groupName()) === 'Alix group name',
    `boGroup.groupName should be "Alix group name" but was ${boGroup.groupName}`
  )
  assert(
    (await alixGroup.groupName()) === 'Alix group name',
    `alixGroup.groupName should be "Alix group name" but was ${alixGroup.groupName}`
  )

  return true
})
