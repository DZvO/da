module.exports = class FileDownloader {
  async #getListOfFiles() {
    return fetch('http://esp32.local/list')
      .then((response) => response.text())
      .then((data) => {
        return data.split(',').filter((element) => element.endsWith('.log'))
      });
  }

  async downloadFiles() {
    // TODO make this more robust/trycatch
    if (!fs.existsSync('dl')) { fs.mkdirSync('dl'); }

    let filesList = await this.#getListOfFiles();
    console.log(filesList);
    //while (filesList.length > 1) {
    {
      const elements = filesList;
      console.log(`%cfetching ${elements}`, `color: gray;`);
      for (let i = 0; i < elements.length; i++) {
        await fetch(`http://esp32.local/get?filename=${elements[i]}`)
          .then((response) => response.text())
          .then(async (data) => {
            document.querySelector('#loadprogress')
              .setAttribute('value', (i / (elements.length - 1)) * 100);
            console.log(`%cdownloaded ${elements[i]}`, `color: gray;`);
            if (fs.existsSync(`dl/${elements[i]}`)) {
              fs.rmSync(`dl/${elements[i]}`);
            }
            fs.writeFileSync(`dl/${elements[i]}`, data);
            console.log(`wrote ${elements[i]}`);

            await fetch(`http://esp32.local/delete?filename=${elements[i]}`)
              .then((s) => console.log(`deleted ${elements[i]}`), (e) => console.log(e));
          })
      }
      //filesList = await this.#getListOfFiles();
      this.cleanUpOldFiles();
    }
  }

  async cleanUpOldFiles() {
    fetch('http://esp32.local/list')
      .then((response) => response.text())
      .then((data) =>  data.split(',').forEach(
        async (e) => {
          if(e == "") return;

          const p = new Date(
            `20${e.substring(0, 2)}`,
            e.substring(2, 4) - 1,
            e.substring(4, 6),
            e.substring(7, 9),
            e.substring(9, 11),
            0,
            0,
          );

          const cutoff = new Date().getTime() - (3 * 24 * 60 * 60 * 1000);
          //                                     day hour min  sec  msec

          if(p < cutoff) {
            await fetch(`http://esp32.local/delete?filename=${e}`)
              .then((s) => console.log(`deleted ${e}`), (e) => console.log(e));
          }
        }
      ))
  }
}