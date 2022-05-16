// TOOD: add openSea

//I shuold probably use an interface for this.. map is probably overkill
export const MarketplaceMap = new Map<string, string>([
    ["M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K", "MagicEden"],
    ["HZaWndaNWHFDd9Dhk5pqUUtsmoBCqzb1MLu3NAh1VX6B", "AlphaArt"],
    ["617jbWo616ggkDxvW1Le8pV38XLbVSyWY8ae6QUmGBAU", "Solsea"],
    ["CJsLwbP1iu5DuUikHEJnLfANgKy6stB2uFgvBBHoyxwz", "Solanart"],
    ["A7p8451ktDCHq5yYaHczeLMYsjRsAkzc3hCXcSrwYHU7", "DigitalEyes"],
    ["AmK5g2XcyptVLCFESBCJqoSfwV3znGoVYQnqEnaAZKWn", "ExchangeArt"],
    [
        "hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk",
        "Auction House - Contract/Not a marketplace",
    ], // This is a crutch - I need to find a new way to find the market of apps using this contract same as the Tokenkeg ones
]);
