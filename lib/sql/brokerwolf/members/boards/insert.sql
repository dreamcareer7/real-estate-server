INSERT INTO brokerwolf_agents_boards(agent_id, mls_id, board_id) VALUES ($1, $2, $3)
ON CONFLICT DO NOTHING