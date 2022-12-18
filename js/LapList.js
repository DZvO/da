module.exports = class LapList {
    constructor(elementName, laps, addCallback, removeCallback) {
        this.elementName = elementName
        this.laps = laps

        this.colors = [
            '#e6194B',
            '#3cb44b',
            '#ffe119',
            '#4363d8',
        ]
        this.addCallback = addCallback
        this.removeCallback = removeCallback

        this.setListContent()
    }

    setListContent() {
        for (let i = 0; i < this.laps.length; i++) {
            const tr = document.createElement("tr")

            const lapn = document.createElement("td")
            lapn.textContent = i

            const laptime = document.createElement("td")
            laptime.textContent = this.formatLaptime(this.laps[i].laptime)

            const timeofday = document.createElement("td")
            timeofday.textContent = this.laps[i].samples[0].timestamp

            const user = document.createElement("td")
            user.textContent = "alex"

            const trackname = document.createElement("td")
            trackname.textContent = this.laps[i].track

            tr.appendChild(lapn)
            tr.appendChild(laptime)
            tr.appendChild(timeofday)
            tr.append(user)
            tr.append(trackname)

            tr.setAttribute("id", "l" + i)
            tr.onclick = (e) => {
                if (tr.classList.contains("selected")) {
                    tr.classList.remove("selected")
                    this.colors.unshift(tr.style.backgroundColor)
                    tr.style.backgroundColor = "white"
                    this.removeCallback(i)
                } else {
                    tr.classList.add("selected")
                    const colorToUse = this.colors.shift()
                    tr.style.backgroundColor = colorToUse
                    this.addCallback(i, tr.style.backgroundColor, this.laps[i].track)
                }
            }
            document.getElementById(this.elementName).appendChild(tr)
        }
    }

    formatLaptime(seconds) {
        const d = new Date(seconds)
        const fminutes = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes()
        const fseconds = (d.getSeconds() < 10 ? "0" : "") + d.getSeconds()
        const fmilliseconds =
            ((d.getMilliseconds() < 10) ? "00" : ((d.getMilliseconds() > 9 && d.getMilliseconds() < 100) ? "0" : "")) + d.getMilliseconds()
        return `${fminutes}:${fseconds}.${fmilliseconds}`
    }
}