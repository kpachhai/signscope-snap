curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=GEMINI_API_KEY" \
-H 'Content-Type: application/json' \
-X POST \
-d '{
"contents": [{
"parts": [{
"text": "You are a blockchain security expert. Given a smart contract ABI and a transaction payload (function selector and calldata), perform the following:\n\n1. Decode the transaction data using the ABI.\n2. Identify the function being called and its arguments.\n3. Explain what this function does in plain English.\n4. Assess the safety of this transaction: is it safe, suspicious, or dangerous?\n5. List any red flags (e.g., unknown calls, high approvals, proxy delegation, contract ownership changes).\n6. Extract key metadata such as recipient address, amount, and function name.\n\nRespond ONLY in the following JSON format:\n{\n \"functionName\": \"...\",\n \"summary\": \"...\",\n \"safetyAssessment\": \"safe | suspicious | dangerous\",\n \"redFlags\": [\"...\"],\n \"metadata\": { \"recipient\": \"...\", \"amount\": \"...\" }\n}\n\n---\n\nContract ABI:\n[\n {\n \"constant\": false,\n \"inputs\": [\n { \"name\": \"_to\", \"type\": \"address\" },\n { \"name\": \"_value\", \"type\": \"uint256\" }\n ],\n \"name\": \"transfer\",\n \"outputs\": [\n { \"name\": \"\", \"type\": \"bool\" }\n ],\n \"payable\": false,\n \"stateMutability\": \"nonpayable\",\n \"type\": \"function\"\n }\n]\n\nTransaction Payload (hex):\na9059cbb000000000000000000000000b9c5b17296cd623facd33293e345c45d5c5f24890000000000000000000000000000000000000000000000000000000000000001"
}]
}]
}'
