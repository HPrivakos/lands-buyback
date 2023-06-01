const undici = require("undici");
const BN = require("bn.js");

// MANA to spend in total
let MAX_SPEND = toWei(new BN(40000));
// Links for lands to buy
let toBuy = [];

async function main() {
  let manaSpent = toWei(new BN(0))
  let lands = await fetchAndJson(
    "https://nft-api.decentraland.org/v1/nfts?first=100&skip=0&sortBy=cheapest&category=parcel&isOnSale=true"
  );
  let estates = await fetchAndJson(
    "https://nft-api.decentraland.org/v1/nfts?first=1000&skip=0&sortBy=cheapest&category=estate&isOnSale=true"
  );
  let estatesMap = estates.map((estate) => {
    return {
      id: estate.nft.tokenId,
      parcels: estate.nft.data.estate.parcels,
      parcelsCount: estate.nft.data.estate.size,
      pricePerParcel: new BN(estate.order.price).div(new BN(estate.nft.data.estate.size)),
      price: new BN(estate.order.price),
    };
  });

  while (true) {
    const floorPrice = new BN(lands[0].order.price);
    const floorPriceEstate = floorPrice.mul(new BN("11")).div(new BN(10));

    const estate = estatesMap.sort((a, b) => a.pricePerParcel.lt(b.pricePerParcel)).find(estate => estate.pricePerParcel.lte(floorPriceEstate) && estate.price.lt(MAX_SPEND.sub(manaSpent))/*  && estate.id */)
    if (estate) {
      if (manaSpent.add(estate.price).gt(MAX_SPEND)) break;
      var x = estate.parcels.map(function (a) { return a.x });
      var y = estate.parcels.map(function (a) { return a.y });

      var min_coords = {
        x: Math.min(x),
        y: Math.min(y)
      }
      var max_coords = {
        x: Math.max(x),
        y: Math.max(y)
      }

      manaSpent = manaSpent.add(estate.price)
      toBuy.push(getMarketplaceUrl('estate', estate.id) + ` for ${fromWei(estate.price).toNumber()} MANA`)
      estatesMap.splice(estatesMap.findIndex(a => a.id == estate.id), 1)
      continue
    }
    else {
      if (manaSpent.add(floorPrice).gt(MAX_SPEND)) break;

      manaSpent = manaSpent.add(floorPrice)
      toBuy.push(getMarketplaceUrl('parcel', lands[0].nft.tokenId) + ` for ${fromWei(floorPrice).toNumber()} MANA`)
      lands.shift()
    }
  }
  console.log(toBuy.join("\n"));
  console.log(`Total ${fromWei(manaSpent).toString()} MANA out of ${fromWei(MAX_SPEND).toString()} MANA`)
}
void main();

async function fetchAndJson(url) {
  const req = await undici.fetch(url);
  const json = await req.json();
  return json.data;
}
function fromWei(bn) {
  const wei = new BN(10).pow(new BN(18));
  return bn.div(wei);
}
function toWei(bn) {
  const wei = new BN(10).pow(new BN(18));
  return bn.mul(wei);
}

function getMarketplaceUrl(type, tokenId) {
  const contractAddress = type == "parcel" ? "0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d" : "0x959e104e1a4db6317fa58f8295f586e1a978c297"
  return `https://market.decentraland.org/contracts/${contractAddress}/tokens/${tokenId}`
}