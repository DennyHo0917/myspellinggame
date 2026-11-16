// Helper to detect likely student school email accounts
export function isStudentEmail(email) {
  if (!email || typeof email !== "string") return false;
  const normalized = email.toLowerCase().trim();
  const atIndex = normalized.indexOf("@");
  if (atIndex === -1) return false;
  const user = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);

  // 1. Explicit student keywords in domain or username
  if (
    /student|students|learner|pupil|\bstu\b/i.test(domain) ||
    /student|students|learner|pupil|\bstu\d/i.test(user)
  ) {
    return true;
  }

  // 2. School domain patterns (e.g. northportschools.org, pdsb.net, k12.or.us, myschool.sch.ae, etc.)
  const isSchoolDomain =
    /school|sch|\.k12\b|\.isd\b|pdsb|\.edu\b|catholic/i.test(domain);

  // 3. Username starting with 2 digits followed by letters (e.g. 29menkvelde, 28frosth - class of 2028/2029)
  if (/^\d{2}[a-z]/i.test(user)) {
    return true;
  }

  // 4. Username with 4+ digits on school domain (e.g. 1007431@pdsb.net, mjennings32@northportschools.org)
  if (isSchoolDomain && (/\d{4,}/.test(user) || /[a-z]+\d{2,}$/i.test(user))) {
    return true;
  }

  // 5. School domain with hyphen-number pattern (e.g. g-ipgp21293106@moe-dl.edu.my)
  if (isSchoolDomain && user.includes("-") && /\d/.test(user)) {
    return true;
  }

  return false;
}
