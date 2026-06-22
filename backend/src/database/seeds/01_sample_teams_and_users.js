exports.seed = async (knex) => {
  // Delete existing data (be careful in production!)
  await knex('users').del();
  await knex('teams').del();

  // Create sample teams
  const teamIds = await knex('teams').insert([
    {
      name: 'AFC Phoenix',
      description: 'Development team for testing',
      created_at: new Date()
    },
    {
      name: 'United FC',
      description: 'Another test team',
      created_at: new Date()
    }
  ]);

  // Create sample users for each team
  await knex('users').insert([
    // Team 1 users
    {
      team_id: teamIds[0],
      email: 'owner@afc.test',
      full_name: 'Team Owner',
      zalo_user_id: 'zuid-owner-001',
      role: 'owner',
      status: 'active',
      created_at: new Date()
    },
    {
      team_id: teamIds[0],
      email: 'manager@afc.test',
      full_name: 'Team Manager',
      zalo_user_id: 'zuid-manager-001',
      role: 'co_manager',
      status: 'active',
      created_at: new Date()
    },
    {
      team_id: teamIds[0],
      email: 'player1@afc.test',
      full_name: 'Player One',
      zalo_user_id: 'zuid-player-001',
      role: 'member',
      status: 'active',
      created_at: new Date()
    },
    {
      team_id: teamIds[0],
      email: 'player2@afc.test',
      full_name: 'Player Two',
      zalo_user_id: 'zuid-player-002',
      role: 'member',
      status: 'active',
      created_at: new Date()
    },
    {
      team_id: teamIds[0],
      email: 'inactive@afc.test',
      full_name: 'Inactive Player',
      zalo_user_id: 'zuid-player-inactive',
      role: 'member',
      status: 'inactive',
      deactivated_at: new Date(),
      created_at: new Date()
    },
    // Team 2 users
    {
      team_id: teamIds[1],
      email: 'owner@united.test',
      full_name: 'United Owner',
      zalo_user_id: 'zuid-owner-002',
      role: 'owner',
      status: 'active',
      created_at: new Date()
    },
    {
      team_id: teamIds[1],
      email: 'player@united.test',
      full_name: 'United Player',
      zalo_user_id: 'zuid-player-003',
      role: 'member',
      status: 'active',
      created_at: new Date()
    }
  ]);

  console.log('✅ Seeds completed: Created 2 teams and 7 users');
};
