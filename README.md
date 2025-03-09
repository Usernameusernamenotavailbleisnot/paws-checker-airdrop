# Paws OG Eligibility Checker

A Node.js bot to check Solana wallet eligibility for the PAWS OG airdrop.

> **IMPORTANT DISCLAIMER:** This software is provided for educational purposes only. Use at your own risk and responsibility. The authors are not responsible for any misuse or any consequences resulting from the use of this software.

## Features

- ✅ Multi-wallet support - process multiple private keys
- ✅ Proxy support (one private key per proxy)
- ✅ Optional proxy usage (configurable)
- ✅ Automatic retry mechanism for all operations
- ✅ Comprehensive error handling
- ✅ Colorful console logging with timestamp and masked wallet addresses
- ✅ Convenient result categorization (eligible/non-eligible)
- ✅ Customizable delays between accounts
- ✅ Attractive ASCII art header

## Requirements

- Node.js (v14 or higher recommended)
- npm or yarn

## Installation

1. Clone this repository or download the files

2. Install the required dependencies:
```
npm install
```

3. Create required files:
   - `pk.txt` - Your Solana private keys (one per line)
   - `proxy.txt` - Your proxies (one per line, optional)
   - Make sure `config.json` is configured properly

## Configuration

Edit the `config.json` file to customize bot behavior:

```json
{
  "enableProxy": true,           // Set to false to disable proxy usage
  "concurrency": 1,              // How many wallets to process at once
  "delayBetweenAccounts": {      // Random delay between processing accounts
    "min": 3000,                 // Minimum delay in milliseconds (3 seconds)
    "max": 7000                  // Maximum delay in milliseconds (7 seconds)
  },
  "retryOptions": {              // Retry settings
    "retries": 3,                // Number of retry attempts
    "minTimeout": 5000,          // Minimum backoff time in milliseconds
    "maxTimeout": 15000          // Maximum backoff time in milliseconds
  },
  "apiEndpoint": "https://api.paws.community/v1/wallet/solana/og",
  "signatureMessage": "PAWS requires you to sign this message to complete the verification process. This is a READ_ONLY interaction and will not affect any of your funds or trigger any transactions.",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
}
```

## File Formats

### Private Key File (`pk.txt`)
```
your_private_key_1
your_private_key_2
...
```

### Proxy File (`proxy.txt`)
```
http://username:password@ip:port
http://username:password@ip:port
...
```

## Usage

Run the bot with:

```
node index.js
```

The bot will:
1. Read your private keys and proxies
2. Check each wallet's eligibility for the PAWS OG airdrop
3. Save results to separate files based on eligibility

## Output

Results are saved in a `result` folder:

- `eligible.txt`: Contains eligible wallets in the format: `privateKey:publicAddress:amount`
- `noteligible.txt`: Contains non-eligible wallets in the format: `privateKey:publicAddress`

## Logs

The bot displays colored logs in the console with the format:
```
[DD/MM/YYYY - HH:MM:SS - wallet] Message
```

Wallet addresses are masked showing only the first 4 and last 4 characters for privacy.

## Troubleshooting

- **Authentication Error**: Ensure your private keys are in the correct format (Base58 encoded)
- **API Connection Error**: Check your internet connection or try using proxies
- **Proxy Error**: Verify your proxy format and credentials

## License

This project is licensed under the MIT License:

## Educational Purpose

This tool is developed solely for educational purposes to demonstrate:
- Interaction with blockchain networks
- Web3 API integration
- Node.js automation techniques
- Handling of cryptocurrency wallets programmatically

The developers do not endorse or encourage any activities that violate terms of service of any platform or website. Users should ensure they comply with all relevant terms, conditions, and legal requirements when using this software.
