// Indian bank IFSC format: 4 letters (bank), a zero, then 6 letters or digits (branch). Example: SBIN0008718
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/**
 * Express middleware for routes that save bank details. A blank IFSC is allowed here because
 * UPI-only details have none; the forms decide when it is required.
 */
export const rejectInvalidIfsc = (req, res, next) => {
  const raw = req.body?.ifsc_code ?? req.body?.ifscCode ?? '';
  const ifsc = String(raw).trim().toUpperCase();
  if (ifsc && !IFSC_REGEX.test(ifsc)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_IFSC',
      message: 'Invalid IFSC code. It must be 4 letters, then 0, then 6 letters or digits. Example: SBIN0008718'
    });
  }
  return next();
};
