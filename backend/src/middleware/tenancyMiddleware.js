const tenancyMiddleware = (req, res, next) => {
  if (!req.user || !req.user.team_id) {
    return res.status(403).json({ error: 'Missing team context' });
  }

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
