# Discord Bot

A Discord bot template built with discord.py. Perfect for creating interactive bots that can respond to commands, moderate servers, and add fun features to your Discord community.

## Quick Setup

1. **Create a Discord Application:** Go to <https://discord.com/developers> and create a new application
2. **Get your token:** In the left sidebar, click "Bot", click "Reset Token" and then copy the token (token format: something.something.something)
3. **Configure environment:** In your `.env` file, fill `DISCORD_TOKEN` with your bot token (paste it after the =)
4. **Invite bot to server:** Back in the Discord developer website, go to "OAuth2" in the left sidebar, scroll down to the scopes section and select "bot" and "applications.commands", scroll down to the bot permissions section and select "Send Messages", scroll down, copy the generated URL and paste it in your browser to invite the bot to your server
5. **Get Discord server ID:** To see the bot work immediately you'll need your Discord server's ID. In Discord, go to User Settings → Advanced and turn Developer Mode on. Then, right click your server icon click copy server ID, then in your `.env` file, fill `GUILD_ID` with your server ID (paste it after the =)
6. **Install dependencies:** `pip install -r requirements.txt`
7. **Run your bot:** `python main.py`

## How does this work?

The setup steps you just completed were about getting Discord's permission to run a bot. Discord requires all bots to be registered through their developer portal and get proper authentication. Here's what you accomplished:

- **Created a Discord Application:** This registers your bot with Discord and gives it a unique identity
- **Got a Bot Token:** This is like a password that lets your code control the bot securely
- **Set up OAuth2 Permissions:** This tells Discord what your bot is allowed to do (send messages, read channels, etc.)
- **Invited the Bot to Your Server:** This gives your bot access to your specific Discord server

**What's a .env file?** A `.env` file is a special file that stores sensitive information like passwords and tokens. It's kept separate from your main code (`main.py`) for security reasons. If you accidentally share your code on GitHub or somewhere public, you don't want your bot token exposed (someone could use it to control your bot!). The `.env` file is usually ignored by version control systems, so your secrets stay private.

When you run `main.py`, your bot connects to Discord using your token and starts listening for events in your server—such as messages, slash commands, or members joining. The main functionality is in `main.py`, which sets up the bot, defines its commands, and handles these events. The bot uses Discord's slash command system, so users can type `/` followed by a command name to interact with it. The bot can respond by sending messages, moderating content, or performing other actions.

## Customizing your bot

**Edit `main.py` to add new commands:**

```python
@bot.tree.command(name="hello", description="Say hello!")
async def hello(interaction: discord.Interaction):
    await interaction.response.send_message("Hello there!")
```

**Add event handlers:**

```python
@bot.event
async def on_member_join(member):
    channel = bot.get_channel(YOUR_CHANNEL_ID)
    await channel.send(f"Welcome {member.mention} to the server!")
```

**Create slash commands:**

```python
@bot.tree.command(name="ping", description="Check bot latency")
async def ping(interaction: discord.Interaction):
    latency = round(bot.latency * 1000)
    await interaction.response.send_message(f"Pong! Latency: {latency}ms")
```

## Advanced Customization

### Adding Cogs (Command Groups)

**Organize commands into categories:**

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

### Adding Database Support

**Store user data or settings:**

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

### Adding Moderation Features

**Create moderation commands:**

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

### Bot Not Responding

**Check these common issues:**

1. **Token is invalid:** Make sure your bot token is correct and hasn't been reset
2. **Bot doesn't have permissions:** Ensure the bot has the necessary permissions in your server
3. **Bot is offline:** Check that your Python script is running and connected to Discord
4. **Commands not syncing:** Run the sync command or restart your bot

### Permission Errors

**If you get permission errors:**

1. Check that your bot has the required permissions in the server
2. Make sure you're using the bot token, not the application token
3. Verify the bot is in the server you're trying to use it in

### Import Errors

**If you get module not found errors:**

1. Install requirements: `pip install -r requirements.txt`

## Learning Resources

Want to learn more about Discord bot development? Check out these resources:

### Discord Documentation

Learn how to use the discord.py library effectively, and understand Discord's developer API

- **[Discord.py Guide](https://discordpy.readthedocs.io/en/stable/)** - Getting started guide
- **[Discord.py Documentation](https://discordpy.readthedocs.io/)** - Official discord.py docs
- **[Discord Developer Portal](https://discord.com/developers/docs)** - Official Discord API docs
- **[Discord API Guide](https://discord.com/developers/docs/intro)** - API introduction and concepts


## Challenges

Once you're comfortable with this template, try these challenges:

- Add a leveling system for users
- Create a music bot that plays songs from YouTube
- Add a moderation system with auto-moderation features
- Create a game bot with mini-games like trivia or hangman
- Add a welcome system that DMs new members
- Create a ticket system for support requests
- Add a reaction role system
- Create a poll/voting system
