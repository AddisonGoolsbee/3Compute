# Discord Bot

A starter Discord bot built with discord.py. Once it is running, the bot can respond to slash commands, moderate a server, or do anything else you program it to do.

This README covers background knowledge that may be necessary or helpful for this lesson. Read through it once before you start coding.

## What a Discord Bot Is

A Discord bot is a Python program that logs into Discord using a special token, listens for events in your server, and sends responses back. Discord validates the token every time the bot connects, so keeping the token private is important.

Before the bot can do anything, Discord needs to know about it. That means registering the bot in Discord's developer portal, granting it the permissions it needs, and inviting it to a server. The steps below walk through all of that.

## Setup

Right-click the `Discord-Bot` folder in the file explorer on the left and select **Open in Terminal**. This executes `cd` (change directory) in your terminal to the project folder so the commands below will work.

Follow the steps in order. The first five happen on Discord's website, not in your code.

1. **Create a Discord application.** Go to <https://discord.com/developers> and click "New Application".
2. **Get the bot token.** In the left sidebar, click "Bot", click "Reset Token", and copy the token that appears. It looks like `something.something.something`.
3. **Save the token.** Open the `.env` file in this folder and paste the token after `DISCORD_TOKEN=` with nothing else on the line.
4. **Invite the bot to a server.** On the developer site, open "OAuth2" in the left sidebar. Under "Scopes", check **bot** and **applications.commands**. Under "Bot Permissions", check **Send Messages**. Copy the URL at the bottom and open it in your browser to add the bot to a server you own.
5. **Get your server ID.** In Discord, open **User Settings > Advanced** and enable **Developer Mode**. Right-click your server icon and select **Copy Server ID**. Paste it into `.env` after `GUILD_ID=`.
6. **Install dependencies.**

   ```bash
   pip install -r requirements.txt
   ```

7. **Start the bot.**

   ```bash
   python main.py
   ```

If everything is working, the terminal prints a "logged in" message and the bot appears online in your server.

## What This README Covers

- What a Discord bot actually is and why the token must stay private
- Step-by-step setup through Discord's developer portal
- What the `.env` file is for
- How to add slash commands, event handlers, and parameterized commands
- Advanced patterns: cogs for grouping commands, SQLite storage, moderation commands
- Troubleshooting, learning resources, challenges, and instructor notes

## What the `.env` File Is For

The `.env` file holds values that should not be shared, such as your bot token. Your main code (`main.py`) reads these values at startup. Keeping them in a separate file means that if you post your code on GitHub or send it to someone, the token does not go with it. Anyone who obtains the token can control your bot.

`.env` is normally listed in `.gitignore` so it is never committed to version control.

## How the Bot Works

When you run `main.py`, the program connects to Discord using the token and starts listening for events: messages being sent, slash commands being run, members joining the server, and so on. The code in `main.py` configures the bot, registers its commands, and responds to those events.

The bot uses Discord's slash command system. Users type `/` in Discord, see a list of available commands, and the bot runs the matching Python function when one is selected.

## Adding Your Own Commands

### A Simple Slash Command

Add this to `main.py`:

```python
@bot.tree.command(name="hello", description="Say hello!")
async def hello(interaction: discord.Interaction):
    await interaction.response.send_message("Hello there!")
```

Restart the bot and type `/hello` in your server. The bot should reply.

### Reacting to Events

Commands run when a user types them. Events run when something happens in the server, such as a new member joining:

```python
@bot.event
async def on_member_join(member):
    channel = bot.get_channel(YOUR_CHANNEL_ID)
    await channel.send(f"Welcome {member.mention} to the server!")
```

Replace `YOUR_CHANNEL_ID` with an actual channel ID. Right-click a channel and select **Copy Channel ID** (with Developer Mode enabled).

### A Slash Command That Uses Data

```python
@bot.tree.command(name="ping", description="Check bot latency")
async def ping(interaction: discord.Interaction):
    latency = round(bot.latency * 1000)
    await interaction.response.send_message(f"Pong! Latency: {latency}ms")
```

## Advanced Customization

### Cogs (Grouping Commands)

Once you have more than a few commands, organize them into categories. Each category is called a "cog":

```python
class Fun(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="joke", description="Tell a joke")
    async def joke(self, interaction: discord.Interaction):
        await interaction.response.send_message("Why did the chicken cross the road? To get to the other side!")

async def setup(bot):
    await bot.add_cog(Fun(bot))
```

### Saving Data with SQLite

To make the bot remember data between restarts (such as user points), use a database:

```python
import sqlite3

def setup_database():
    conn = sqlite3.connect('bot_data.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (user_id INTEGER PRIMARY KEY, points INTEGER DEFAULT 0)''')
    conn.commit()
    conn.close()
```

### Moderation Commands

```python
@app_commands.command(name="kick", description="Kick a user")
@app_commands.describe(user="User to kick", reason="Reason for kicking")
async def kick(interaction: discord.Interaction, user: discord.Member, reason: str = "No reason provided"):
    if interaction.user.guild_permissions.kick_members:
        await user.kick(reason=reason)
        await interaction.response.send_message(f"{user.mention} has been kicked. Reason: {reason}")
    else:
        await interaction.response.send_message("You don't have permission to kick users!", ephemeral=True)
```

## Troubleshooting

### The Bot Is Not Responding

Check these in order:

1. The token in `.env` is correct and has not been reset. If you reset the token on Discord's site, the old one no longer works.
2. The bot has the correct permissions in the server. Check the role settings for the bot's role.
3. Your Python script is running. If the terminal shows no output, the bot is offline.
4. Commands are not syncing. Restart the bot to re-register the slash commands with Discord.

### Permission Errors

1. Confirm the bot has the required permissions in the server.
2. Verify you copied the bot token, not the application ID or client secret.
3. Confirm the bot is in the server you are testing in.

### Import Errors

Install the requirements:

```bash
pip install -r requirements.txt
```

## Learning Resources

- [Discord.py Guide](https://discordpy.readthedocs.io/en/stable/)
- [Discord.py Documentation](https://discordpy.readthedocs.io/)
- [Discord Developer Portal](https://discord.com/developers/docs)
- [Discord API Introduction](https://discord.com/developers/docs/intro)

## Challenges

Once you are comfortable with the template, try one of these:

- A leveling system that tracks how much each user types
- A music bot that plays songs from YouTube links
- Automated moderation that warns users for banned words
- Mini-games such as trivia or hangman
- A welcome DM for new members
- A ticket system for support requests
- Reaction roles (react with an emoji to receive a role)
- A poll or voting command

## For Instructors

To share this template with a class:

1. Copy this folder into your classroom's `assignments/` directory.
2. Pre-configure the `.env` file or add starter commands as needed.
3. Students can find it under **Templates > Classroom Assignments**, or by browsing the `assignments/` folder in their classroom.
