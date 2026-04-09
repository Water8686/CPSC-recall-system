/**
 * Request metadata for login / session audit (server-side only).
 * @param {import('express').Request} req
 */
export function collectRequestAuditContext(req) {
  const xf = req.headers['x-forwarded-for'];
  const forwarded =
    typeof xf === 'string'
      ? xf
      : Array.isArray(xf)
        ? xf.join(', ')
        : null;
  const realIp = req.headers['x-real-ip'];
  const forwardedFor =
    forwarded ||
    (typeof realIp === 'string' ? realIp : Array.isArray(realIp) ? realIp.join(', ') : null);

  return {
    ip: req.ip || null,
    forwarded_for: forwardedFor,
    user_agent: req.get('user-agent') || null,
    accept_language: req.get('accept-language') || null,
    sec_ch_ua: req.get('sec-ch-ua') || null,
    sec_ch_ua_platform: req.get('sec-ch-ua-platform') || null,
    sec_ch_ua_mobile: req.get('sec-ch-ua-mobile') || null,
    origin: req.get('origin') || null,
    referer: req.get('referer') || null,
  };
}
