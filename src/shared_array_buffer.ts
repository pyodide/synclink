let temp: typeof ArrayBuffer | typeof SharedArrayBuffer;
if (typeof SharedArrayBuffer === "undefined") {
  temp = ArrayBuffer;
} else {
  temp = SharedArrayBuffer;
}
export default temp;
