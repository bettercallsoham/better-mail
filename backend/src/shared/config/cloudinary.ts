import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUDNAME!,
});

const main = async () => {
  const res = await cloudinary.api.ping();
  console.log(res);
};

main();

export default cloudinary;
