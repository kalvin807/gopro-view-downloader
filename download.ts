import axios from "axios";
import fs from "fs";
import minimist from "minimist";

async function main(url: string, folder: string) {
  const response = await axios.get(url);
  const matched = (response.data as string).matchAll(
    /<script>window\.__reflectData=(?<json>.*);<\/script>/gm
  );
  const json = JSON.parse([...matched]?.[0].groups?.json as string);
  const ids = (json.collectionMedia as Array<any>).map((elm) => {
    return elm.id;
  });

  const urls = ids.map((id) => `https://api.gopro.com/media/${id}/download`);
  const mediaUrls = await Promise.all(
    urls.map((url) =>
      axios.get(url).then((res) => ({
        filename: res.data.filename,
        url: res.data._embedded.files[0].url,
      }))
    )
  );

  await Promise.all(
    mediaUrls.map((elm, id) => {
      axios.get(elm.url, { responseType: "stream" }).then((blob) => {
        console.log(elm.filename);
        blob.data.pipe(fs.createWriteStream(`${folder}/${elm.filename}`));
      });
    })
  );
}

const args = minimist(process.argv.slice(2));

const url = args.u;
const folder = args.o || "output";

if (!url || !folder) {
  console.log("Usage: download.ts -u <url> -o <optional:folder>");
} else {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
  }
  main(url, folder);
}
