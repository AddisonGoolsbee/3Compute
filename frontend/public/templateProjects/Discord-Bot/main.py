import discord
from discord import app_commands

TOKEN = "MTM5MjYzNTE3NDE2ODAzNTM5MQ.GjWnpg.CeieaFd4bhL-VTfO8GuY3Hp9xT1MrcoDznRRdE"
GUILD_ID = 1392628083659640904


class MyClient(discord.Client):
    def __init__(self):
        intents = discord.Intents.default()
        super().__init__(intents=intents)
        self.tree = app_commands.CommandTree(self)

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
