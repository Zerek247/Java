// Ejecutar con:  node tests/engine.test.js
const J = require('../js/engine.js');
let pass = 0, fail = 0;
function out(code, expected) {
  const r = J.run(code);
  const got = r.ok ? r.out.trimEnd() : (r.phase === 'runtime' ? r.out.trimEnd() : 'CE: ' + r.error.msg);
  if (got === expected) pass++;
  else { fail++; console.log('✗', JSON.stringify(code), '\n   esperado:', JSON.stringify(expected), '\n   obtenido:', JSON.stringify(got)); }
}
function ce(code, frag) {
  const r = J.run(code);
  if (!r.ok && r.phase === 'compile' && r.error.msg.includes(frag)) pass++;
  else { fail++; console.log('✗ CE esperado', JSON.stringify(code), frag, '→', r.ok ? r.out : r.error.msg); }
}
function type(code, id, t) {
  const r = J.typeOf(code, id);
  if (r.ok && r.type === t) pass++;
  else { fail++; console.log('✗ tipo', code, id, t, '→', r); }
}

// Promoción
type('byte a = 1; byte b = 2; var r = a + b;', 'r', 'int');
type('short a = 1; char b = 2; var r = a * b;', 'r', 'int');
type('int a = 1; long b = 2; var r = a + b;', 'r', 'long');
type('long a = 1; float b = 2; var r = a + b;', 'r', 'float');
type('float a = 1; double b = 2; var r = a + b;', 'r', 'double');
type("var r = 'a' + 'b';", 'r', 'int');
type('byte a = 1; var r = -a;', 'r', 'int');
type('byte a = 1; var r = a++;', 'r', 'byte');
type('byte a = 1; long s = 2; var r = a << s;', 'r', 'int');
type('var r = 1 + 2 + "x";', 'r', 'String');
type('byte b = 1; var r = true ? b : 100;', 'r', 'byte');
type('byte b = 1; var r = true ? b : 1000;', 'r', 'int');
type("var r = false ? 'a' : 0;", 'r', 'char');

// Salidas
out('System.out.println(7 / 2);', '3');
out('System.out.println(-7 / 2);', '-3');
out('System.out.println(-7 % 3);', '-1');
out('System.out.println(7 % -3);', '1');
out('System.out.println(7.0 / 2);', '3.5');
out('System.out.println(1 / 0.0);', 'Infinity');
out('System.out.println(0.0 / 0);', 'NaN');
out('System.out.println(1 / 0);', 'Exception in thread "main" java.lang.ArithmeticException: / by zero');
out('System.out.println(Integer.MAX_VALUE + 1);', '-2147483648');
out('System.out.println(Long.MAX_VALUE + 1);', '-9223372036854775808');
out('System.out.println((byte) 200);', '-56');
out('System.out.println((byte) 128);', '-128');
out('System.out.println((byte) 300);', '44');
out('System.out.println((short) 65537);', '1');
out('System.out.println((int) 3.99);', '3');
out('System.out.println((int) -3.99);', '-3');
out('System.out.println((int) 1e20);', '2147483647');
out('System.out.println((byte) 1e20);', '-1');
out('System.out.println((char) 65);', 'A');
out("System.out.println('a' + 1);", '98');
out("System.out.println((char)('a' + 1));", 'b');
out("System.out.println(\"\" + 'a' + 1);", 'a1');
out('System.out.println(1 + 2 + "3" + 4 + 5);', '3345');
out('int x = 5; x = x++; System.out.println(x);', '5');
out('int x = 5; int y = x++ + ++x; System.out.println(x + " " + y);', '7 12');
out('int x = 5; x += x++ * 2; System.out.println(x);', '15');
out('byte b = 127; b++; System.out.println(b);', '-128');
out('short s = 10; s += 5.7; System.out.println(s);', '15');
out('int i = 10; i *= 2.5; System.out.println(i);', '25');
out('char c = \'A\'; c += 2; System.out.println(c);', 'C');
out('int x = 3; boolean b = x > 5 && x++ > 1; System.out.println(x + " " + b);', '3 false');
out('int x = 3; boolean b = x > 5 & x++ > 1; System.out.println(x + " " + b);', '4 false');
out('System.out.println(1 << 33);', '2');
out('System.out.println(-8 >> 1);', '-4');
out('System.out.println(-8 >>> 28);', '15');
out('System.out.println(-1 >>> 1);', '2147483647');
out('System.out.println(~5);', '-6');
out('System.out.println(5 & 3);', '1');
out('System.out.println(5 | 3);', '7');
out('System.out.println(5 ^ 3);', '6');
out('System.out.println(true ^ true);', 'false');
out('System.out.println(0.1 + 0.2);', '0.30000000000000004');
out('System.out.println(0.1f + 0.2f);', '0.3');
out('float f = 1.1f; System.out.println(f);', '1.1');
out('System.out.println((double) 1.1f);', '1.100000023841858');
out('System.out.println(1e7);', '1.0E7');
out('System.out.println(123456789.0f);', '1.2345679E8');
out('System.out.println(100.0 / 3);', '33.333333333333336');
out('System.out.println(10 == 10.0);', 'true');
out("System.out.println('a' == 97);", 'true');
out('System.out.println(Double.NaN == Double.NaN);', 'false');
out('int i = 16777217; float f = i; System.out.println(f);', '1.6777216E7');
out('long l = 2147483648L; int i = (int) l; System.out.println(i);', '-2147483648');
out('System.out.println(-2147483648);', '-2147483648');
out('System.out.println(0x7F + 010 + 0b11);', '138');
out('System.out.println(1_000_000);', '1000000');
out('String a = "hi"; String b = "hi"; System.out.println(a == b);', 'true');
out('String a = "hi"; String b = "h"; String c = b + "i"; System.out.println(a == c);', 'false');
out('final String b = "h"; String c = b + "i"; System.out.println("hi" == c);', 'true');
out('int x = 10; System.out.println(x > 5 ? "big" : "small");', 'big');
out('System.out.println(true ? 1 : 2.0);', '1.0');
out("System.out.println(true ? 'x' : 0);", 'x');
out('int a = 2, b = 3; System.out.println(a + b * a - b / a % b);', '7');
out('int x = 1; x += x++ + ++x; System.out.println(x);', '5');
out('int a = 5; a -= a - -a; System.out.println(a);', '-5');
out('System.out.println(-Integer.MIN_VALUE);', '-2147483648');
out('long big = 1000000 * 1000000; System.out.println(big);', '-727379968');
out('long big = 1000000L * 1000000; System.out.println(big);', '1000000000000');
out('System.out.println((byte)(byte)-129);', '127');
out('int x = 0; if (x++ == 0 || x++ == 5) System.out.println(x);', '1');

// Errores de compilación
ce('byte b = 128;', 'lossy conversion from int to byte');
ce('byte a = 1; byte b = 2; byte c = a + b;', 'lossy conversion from int to byte');
ce('short s = 1; s = s + 1;', 'lossy conversion from int to short');
ce('float f = 1.5;', 'lossy conversion from double to float');
ce('long l = 3000000000;', 'integer number too large');
ce('int i = 5L;', 'lossy conversion from long to int');
ce('byte b = 10L;', 'lossy conversion from long to byte');
ce('char c = -1;', 'lossy conversion from int to char');
ce('byte b = 1; char c = b;', 'lossy conversion from byte to char');
ce('char c = 1; short s = c;', 'lossy conversion from char to short');
ce('int x = 1; byte b = x;', 'lossy conversion from int to byte');
ce('boolean b = 1;', 'int cannot be converted to boolean');
ce('int i = (int) true;', 'boolean cannot be converted to int');
ce('int x = 5; if (x = 5) {}', 'int cannot be converted to boolean');
ce('int x; System.out.println(x);', 'might not have been initialized');
ce('int x = 1; int x = 2;', 'already defined');
ce('int x = 1; x + 1;', 'not a statement');
ce('5++;', 'unexpected type');
ce('int x = 1; (x + 1)++;', 'unexpected type');
ce('final int x = 1; x++;', 'final variable');
ce('int a = 1; boolean b = a && true;', "bad operand types for binary operator '&&'");
ce('boolean b = !5;', "bad operand type int for unary operator '!'");
ce('int x = 1_;', 'illegal underscore');
ce('double d = 1_.5;', 'illegal underscore');
ce('int x = 0x_1;', 'illegal underscore');
ce('int x = 09;', 'integer number too large');
ce('var x;', 'cannot infer type');
ce('var a = 1, b = 2;', "'var' is not allowed");
ce('String s = 5;', 'int cannot be converted to String');
ce('int i = "5";', 'String cannot be converted to int');
ce('boolean b = 1.0 & 2.0;', "bad operand types for binary operator '&'");
ce('int x = -(2147483648);', 'integer number too large');
ce("char c = '';", 'empty character literal');
ce("char c = 'ab';", 'unclosed character literal');
ce('int x = 1; int y = x + 1 System.out.println(y);', "';' expected");

// Pasa con constantes
out('final int x = 10; byte b = x; System.out.println(b);', '10');
out("byte b = 'a'; System.out.println(b);", '97');
out('char c = 65; System.out.println(c);', 'A');
out('byte b = 10 + 20; System.out.println(b);', '30');
out('final byte a = 1, b = 2; byte c = a + b; System.out.println(c);', '3');
out('short s = (short) 5; char c = (short) 5; System.out.println(c + 0);', '5');
out('public class Main { public static void main(String[] args) { int x = 4; System.out.println(x * 2); } }', '8');

console.log(`\n${pass} ok, ${fail} fallos`);
process.exit(fail ? 1 : 0);
