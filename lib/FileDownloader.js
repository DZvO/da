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
    while (filesList.length > 1) {
      const elements = filesList;
      console.log(`fetching ${elements}`);
      for (let i = 0; i < elements.length; i++) {
        fetch(`http://esp32.local/get?filename=${elements[i]}`)
          .then((response) => response.text())
          .then((data) => {
            document.querySelector('#loadprogress')
              .setAttribute('value', (i / (elements.length - 1)) * 100);
            console.log(`downloaded ${elements[i]}`);
            if (fs.existsSync(`dl/${elements[i]}`)) {
              fs.rmSync(`dl/${elements[i]}`);
            }
            fs.writeFileSync(`dl/${elements[i]}`, data);
            console.log(`wrote ${elements[i]}`);

            fetch(`http://esp32.local/delete?filename=${elements[i]}`)
              .then((s) => console.log(`deleted ${elements[i]}`), (e) => console.log(e));
          })
      }
      filesList = await this.#getListOfFiles();
    }
  }
}