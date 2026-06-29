export function generateReferralCode(email: string): string {
  const prefix = email.split("@")[0].replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}${rand}`;
}

export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return first.trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

export type FraudCheckResult =
  | { fraudulent: false }
  | { fraudulent: true; reason: string };

export function checkFraud(opts: {
  newUserIp: string;
  referrerIp: string | null;
  newUserAgent: string;
  referrerUserAgent: string | null;
  newUserEmail: string;
  referrerEmail: string;
  timeDiffMs: number;
}): FraudCheckResult {
  const { newUserIp, referrerIp, newUserAgent, referrerUserAgent, newUserEmail, referrerEmail, timeDiffMs } = opts;

  if (referrerIp && newUserIp !== "unknown" && referrerIp !== "unknown" && newUserIp === referrerIp) {
    return { fraudulent: true, reason: `IP_MATCH: same IP (${newUserIp}) as referrer` };
  }

  const TIME_WINDOW_MS = 10 * 60 * 1000;
  if (referrerUserAgent && newUserAgent && timeDiffMs < TIME_WINDOW_MS) {
    const normalise = (ua: string) => ua.toLowerCase().replace(/[\s\d.]+/g, " ").trim().slice(0, 120);
    if (normalise(newUserAgent) === normalise(referrerUserAgent)) {
      return {
        fraudulent: true,
        reason: `USERAGENT_MATCH: identical user-agent registered within ${Math.round(timeDiffMs / 1000)}s of referrer`,
      };
    }
  }

  const normaliseEmail = (e: string) => e.toLowerCase().replace(/[.\-_+]/g, "").split("@")[0];
  if (normaliseEmail(newUserEmail) === normaliseEmail(referrerEmail)) {
    return { fraudulent: true, reason: "EMAIL_SIMILARITY: normalised email matches referrer" };
  }

  return { fraudulent: false };
}
