import requests

response = requests.get("https://www.birdflop.com")
if response.status_code == 200:
    print("Successfully fetched the page!")
    print("Content length:", len(response.content))
else:
    print("Failed to fetch the page. Status code:", response.status_code)
print("Script execution complete.")