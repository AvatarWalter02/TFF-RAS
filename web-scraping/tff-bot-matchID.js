require('dotenv').config();
const fs = require('fs');
const Log = require("./Log");
let logger = new Log();
logger.setLevel();

async function initializePage() {
    logger.debug("browser init started");
    const {chromium} = require('playwright');

    const browser = await chromium.launch({
        headless: process.env.NODE_ENV === "production",
        args: ["--disable-gpu"]
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36',
        bypassCSP: true,
        locale: 'tr-TR',
        viewport: {
            width: 1280,
            height: 800
        }
    });
    /*
    const handle = await page.evaluateHandle(() => ({window, document}));
const properties = await handle.getProperties();
const windowHandle = properties.get('window');
const documentHandle = properties.get('document');
     */


    const page = await context.newPage();
    const preloadFile = fs.readFileSync(__dirname + '/headless-spoof.js', 'utf8');
    await page.addInitScript(preloadFile);

    if (process.env.NODE_ENV === "production") {
        //await page.route('**/*.{png,jpg,jpeg}', route => route.abort());
    }

    page.on('console', msg => logger.debug('PAGE LOG:', msg.text()));
    logger.debug("playwright init completed");
    return [browser, page];
}

async function parseGoalInfo(str) {
    let goal = {Player : "", Time: "", How : ""};
    let mini="";
    for (let i = 0; i < str.length; i++) {
        if (str[i]===",") {
            goal.Player=(mini);
            mini="";
            i++;
        }
        if (str[i]===".") {
            goal.Time=(mini);
            mini="";
            i+=5;
        }
        if (str[i]===")") {
            goal.How=(mini);
            mini=="";
        }
        mini+=str[i];
    }
    return goal;
}

async function collectData(browser, page, leechUrl) {
    let refereeResults = [];
    let observerResults = [];
    let homeCards = [];
    let awayCards = [];
    let homeGoals = [];
    let awayGoals = [];
    let teamsInfo = {home: "", away: "", homeScore: "", awayScore:""};
    let timeInfo = {date : "", hour: ""};
    try {
        //open up the page
        await page.goto(leechUrl, {waitUntil: 'networkidle'});

        try {
            await page.waitForSelector('td.MacDetayAltBG', { //find the cell that holds the details for the game and wait until it is visible
                timeout: 2000,
                state: "visible"
            });

            let homeTeamName = await page.locator("//a[contains(@id,'MacBilgiDisplay1_dtMacBilgisi_lnkTakim1')]").elementHandles();
            let awayTeamName = await page.locator("//a[contains(@id,'MacBilgiDisplay1_dtMacBilgisi_lnkTakim2')]").elementHandles();
            let homeTeamScore = await page.locator("//span[contains(@id,'MacBilgiDisplay1_dtMacBilgisi_lblTakim1Skor')]").elementHandles();
            let awayTeamScore = await page.locator("//span[contains(@id,'MacBilgiDisplay1_dtMacBilgisi_Label12')]").elementHandles();
            //teamsInfo = {home: await homeTeamName[0].innerText(), away: await awayTeamName[0].innerText(), homeScore : await homeTeamScore[0].innerText(), awayScore : await awayTeamScore[0].innerText()}
            teamsInfo.home = await homeTeamName[0].innerText();
            teamsInfo.away = await awayTeamName[0].innerText();
            teamsInfo.awayScore = await awayTeamScore[0].innerText();
            teamsInfo.homeScore = await homeTeamScore[0].innerText();

            
            
            //find all the anchors that holds the referee information via css selectors
            let refs = await page.locator("td.MacDetayAltBG>div a").allTextContents();

            let divSpans = await page.locator("td.MacDetayAltBG>div span").allTextContents();

            let timeStr = divSpans[3];
            let arr = timeStr.split("-");
            timeInfo.date = arr[0].trim();
            timeInfo.hour = arr[1].trim();

            const regex = /(.*)\((.*)\)/gm;
            for (let i = 4; i < 6; i++) {
                let element = divSpans[i];
                let observer = {name: "", duty: ""};
                let m; //match object to be used in regular expression
                while ((m = regex.exec(element)) !== null) {

                    if (m.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }
                    m.forEach((match, groupIndex) => {
                        switch (groupIndex) {
                            case 1 :
                                observer.name = match;
                                break;
                            case 2:
                                observer.duty = match;
                                break;
                            default:
                                break;
                        }
                    });
                }
                observerResults.push(observer);
            }
            /* refs is like below
            [
              'CORENDON AIRLINES PARK ANTALYA STADI - ANTALYA',
              'ATİLLA KARAOĞLAN(Hakem)',
              'MUSTAFA EMRE EYİSOY(1. Yardımcı Hakem)',
              'İBRAHİM ÇAĞLAR UYARCAN(2. Yardımcı Hakem)',
              'SUAT ARSLANBOĞA(Dördüncü Hakem)',
              'ALPER ULUSOY(VAR)',
              'ALPER ÇETİN(AVAR)'
            ]
             */

            /*
            divSpans is like this
            [
            'Spor Toto Süper Lig (Profesyonel Takım) ',
            'Maç Kodu:',
            '1009',
            '7.08.2022 - 19:15',
            'İSMET ARZUMAN(Gözlemci)',
            'SEBAHATTİN ŞAHİN(Gözlemci)',
            'LEVENT KARABUDAK(Temsilci)',
            'NAHİT KARAKAŞ(Temsilci)',
            'REFİK EMRE(Temsilci)'
            ]
            */

            //regular expression to strip out the names and duties
            
            for(let i=1;i<refs.length;i++) { //starts from 1, as 0 has the name of stadium

                let str = refs[i];

                let ref = { name : "", duty : ""}; //the record object  to hold the referee details

                let m; //match object to be used in regular expression
                while ((m = regex.exec(str)) !== null) {

                    if (m.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }


                    m.forEach((match, groupIndex) => {
                        switch (groupIndex) {
                            case 1 :
                                ref.name = match;
                                break;
                            case 2:
                                ref.duty = match;
                                break;
                            default:
                                break;
                        }
                    });
                }
                //push the referee record object to the array
                refereeResults.push(ref);
            }
            // //cards
            //home
            let homeCardPlayers = await page.locator("//td[not(@class)]/a[contains(@id,'grdTakim1_rptKartlar')]").elementHandles(); //select all the anchor elements that has grdTakim1_rptKartlar in their id attribute and inside a td that does not have class attribute
            let homeCardPlayerTime = await page.locator("//td[not(@class)]/span[contains(@id,'grdTakim1_rptKartlar')]").elementHandles(); //select all the span elements that has grdTakim1_rptKartlar in their id attribute and inside a td that does not have class attribute
            let homeCardPlayerCardImg = await page.locator("//td[not(@class)]/img[contains(@id,'grdTakim1_rptKartlar')]").elementHandles(); //select all the span elements that has grdTakim1_rptKartlar in their id attribute and inside a td that does not have class attribute

            for(let i=0;i<homeCardPlayers.length;i++) {
                homeCards.push({
                    name : await homeCardPlayers[i].innerText(),
                    playerUrl : await homeCardPlayers[i].getAttribute("href"),
                    time : await homeCardPlayerTime[i].innerText(),
                    cardType : (await homeCardPlayerCardImg[i].getAttribute("src")).indexOf("sarikart") !== -1 ? "yellow" : "red" //might be wrong as there can be 2 yellow then red
                });
            }

            //away
            let awayCardPlayers = await page.locator("//td[not(@class)]/a[contains(@id,'grdTakim2_rptKartlar')]").elementHandles(); 
            let awayCardPlayerTime = await page.locator("//td[not(@class)]/span[contains(@id,'grdTakim2_rptKartlar')]").elementHandles();
            let awayCardPlayerCardImg = await page.locator("//td[not(@class)]/img[contains(@id,'grdTakim2_rptKartlar')]").elementHandles();

            for(let i=0;i<awayCardPlayers.length;i++) {
                awayCards.push({
                    name : await awayCardPlayers[i].innerText(),
                    playerUrl : await awayCardPlayers[i].getAttribute("href"),
                    time : await awayCardPlayerTime[i].innerText(),
                    cardType : (await awayCardPlayerCardImg[i].getAttribute("src")).indexOf("sarikart") !== -1 ? "yellow" : "red" //might be wrong as there can be 2 yellow then red
                });
            }

            //goals
            //home 
            let homeGoalsInfo = await page.locator("//td[not(@class)]/a[contains(@id,'grdTakim1_rptGoller')]").elementHandles();
            let awayGoalsInfo = await page.locator("//td[not(@class)]/a[contains(@id,'grdTakim2_rptGoller')]").elementHandles();
            for (let i = 0; i < homeGoalsInfo.length; i++) {
                homeGoals.push(await parseGoalInfo(await homeGoalsInfo[i].innerText()));
            }
            for (let i = 0; i < awayGoalsInfo.length; i++) {
                awayGoals.push(await parseGoalInfo(await awayGoalsInfo[i].innerText()));
            }

        } catch (err) {
            logger.error("Exception in referee scrape : ", err.toString());
        }


    } catch (e) {
        logger.error("Exception in collect data : ", e.toString());
    }
    let data = {Refs : refereeResults, Teams: teamsInfo, Observers : observerResults, Time: timeInfo, HomeCards: homeCards, AwayCards: awayCards, HomeGoalsDetails:homeGoals, AwayGoalsDetails:awayGoals};
    return data;
}

async function leechWithMatchID(matchid) {
    let page, browser, data;
    try {
        [browser, page] = await initializePage();
        let leechUrl = 'https://www.tff.org/Default.aspx?pageID=29&macId='+matchid;
        data = await collectData(browser, page, leechUrl);

    } catch (e) {
        logger.error("Exception in leech : ", e);
    }
    logger.debug("will close the browser", browser.close());
    if (browser && browser.close()) await browser.close();

    
    return data;
}

async function leechWithHref(hrefStr) {
    let page, browser, data;
    try {
        [browser, page] = await initializePage();
        let leechUrl = 'https://www.tff.org/'+hrefStr;
        data = await collectData(browser, page, leechUrl);

    } catch (e) {
        logger.error("Exception in leech : ", e);
    }
    logger.debug("will close the browser", browser.close());
    if (browser && browser.close()) await browser.close();

    
    return data;
}

module.exports = {leechWithMatchID,leechWithHref};