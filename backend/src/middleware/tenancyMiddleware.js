const tenancyMiddleware = (req, res, next) => {
  if (!req.user || !req.user.team_id) {
    return res.status(403).json({ error: 'Missing team context' });
  }

  // Store team_id in app context for all database queries
  req.app.set('team_id', req.user.team_id);
  req.app.set('current_role', req.user.role);

  // Create team object for handlers to access req.team.id
  req.team = {
    id: req.user.team_id
  };

  // Add helper to automatically scope queries
  req.teamScope = (query) => {
    return query.where('team_id', req.user.team_id);
  };

  next();
};

module.exports = tenancyMiddleware;
