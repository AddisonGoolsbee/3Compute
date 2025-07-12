import discord
from discord import app_commands
from dotenv import load_dotenv
import os

load_dotenv()

TOKEN = os.getenv("TOKEN")
GUILD_ID = os.getenv("GUILD_ID")

if not TOKEN:
    raise ValueError("TOKEN env variable is not set")
if not GUILD_ID:
    raise ValueError("GUILD_ID env variable is not set")

class MyClient(discord.Client):
    def __init__(self):
        intents = discord.Intents.default()
        super().__init__(intents=intents)
        self.tree = app_commands.CommandTree(self)

    if GUILD_ID:
        async def setup_hook(self):
            guild = discord.Object(id=GUILD_ID)
            self.tree.copy_global_to(guild=guild)
            await self.tree.sync(guild=guild)
            print(f"Synced slash commands to guild {GUILD_ID}")


client = MyClient()


@client.tree.command(name="ping", description="Replies with pong")
async def ping(interaction: discord.Interaction):
    await interaction.response.send_message(f"pong")


@client.tree.command(name="echo", description="Echoes back your message")
@app_commands.describe(text="What should I repeat?")
async def echo(interaction: discord.Interaction, text: str):
    await interaction.response.send_message(text)


client.run(TOKEN)
