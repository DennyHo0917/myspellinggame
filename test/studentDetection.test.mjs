import test from "node:test";
import assert from "node:assert/strict";
import { isStudentEmail } from "../src/js/studentDetection.mjs";

test("isStudentEmail correctly identifies student emails", () => {
  // Student patterns from real database
  assert.equal(isStudentEmail("29menkvelde@adachristian.org"), true);
  assert.equal(isStudentEmail("28frosth@adachristian.org"), true);
  assert.equal(isStudentEmail("mjennings32@northportschools.org"), true);
  assert.equal(isStudentEmail("1007431@pdsb.net"), true);
  assert.equal(isStudentEmail("g-ipgp21293106@moe-dl.edu.my"), true);
  assert.equal(isStudentEmail("student@gmail.com"), true);
  assert.equal(isStudentEmail("john@student.uni.edu"), true);
  assert.equal(isStudentEmail("stu12345@school.org"), true);
  assert.equal(isStudentEmail("isl.bor22@manurewaint.school.nz"), true);

  // Adult educators / regular parents (should NOT be identified as student)
  assert.equal(isStudentEmail("rreising@valpo.k12.in.us"), false);
  assert.equal(isStudentEmail("gvolpe@altoonasd.com"), false);
  assert.equal(isStudentEmail("teacher@northportschools.org"), false);
  assert.equal(isStudentEmail("principal.smith@k12.or.us"), false);
  assert.equal(isStudentEmail("dennyho0917@gmail.com"), false);
  assert.equal(isStudentEmail("parent@yahoo.com"), false);
  assert.equal(isStudentEmail("john.doe@gmail.com"), false);
  assert.equal(isStudentEmail(""), false);
  assert.equal(isStudentEmail(null), false);
});
