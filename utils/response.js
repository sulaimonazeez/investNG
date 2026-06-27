const success = (res, data = {}, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data, timestamp: new Date().toISOString() });

const error = (res, message = 'An error occurred', statusCode = 400, errors = null) => {
  const body = { success: false, message, timestamp: new Date().toISOString() };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

const paginate = (res, data, total, page, limit, message = 'Success') =>
  res.status(200).json({
    success: true, message, data,
    pagination: { total, page: +page, limit: +limit, pages: Math.ceil(total / limit) },
    timestamp: new Date().toISOString(),
  });

module.exports = { success, error, paginate };
