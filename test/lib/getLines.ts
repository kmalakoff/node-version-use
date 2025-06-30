import cr from 'cr';

export default function getLines(stdout: string | Buffer<ArrayBufferLike>): string[] {
  return cr(stdout.toString())
    .split('\n')
    .map((line) => (line.indexOf(': ') >= 0 ? line.split(': ')[1] : line))
    .filter((line) => line.length > 0 && line.indexOf('installed') < 0);
}
