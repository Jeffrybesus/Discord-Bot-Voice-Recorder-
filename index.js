require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, EndBehaviorType } = require('@discordjs/voice');
const prism = require('prism-media');
const fs = require('fs');
const path = require('path');
const Mixer = require('audio-mixer');
const { exec } = require('child_process'); // Allows the bot to run terminal commands

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

const activeRecordings = new Map();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}! Ready to record and auto-convert.`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    // Trigger when a user joins
    if (newState.channelId && !oldState.channelId && !newState.member.user.bot) {
        const channel = newState.channel;
        
        if (activeRecordings.has(channel.guild.id)) return;

        const timestamp = Date.now();
        const pcmFilename = path.join(__dirname, `mixed-recording-${timestamp}.pcm`);
        const mp3Filename = path.join(__dirname, `recording-${timestamp}.mp3`);

        console.log(`User joined ${channel.name}. Starting master recording...`);

        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: false, 
                selfMute: true   
            });

            const mixer = new Mixer.Mixer({
                channels: 2,
                bitDepth: 16,
                sampleRate: 48000,
                clearInterval: 250
            });

            const writeStream = fs.createWriteStream(pcmFilename);
            mixer.pipe(writeStream);

            // Save the filenames into the session map so we know what to convert later
            activeRecordings.set(channel.guild.id, { 
                connection, 
                mixer, 
                writeStream, 
                channelId: channel.id,
                pcmPath: pcmFilename,
                mp3Path: mp3Filename
            });

            connection.receiver.speaking.on('start', (userId) => {
                const session = activeRecordings.get(channel.guild.id);
                if (!session) return;

                const opusStream = connection.receiver.subscribe(userId, {
                    end: {
                        behavior: EndBehaviorType.AfterSilence,
                        duration: 1000 
                    }
                });

                const pcmDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000, engine: 'opusscript' });
                
                const mixerInput = session.mixer.input({
                    channels: 2,
                    bitDepth: 16,
                    sampleRate: 48000
                });

                opusStream.pipe(pcmDecoder).pipe(mixerInput);

                opusStream.on('end', () => {
                    session.mixer.removeInput(mixerInput);
                });
            });

        } catch (error) {
            console.error('Error starting mixed recording:', error);
        }
    }

    // Trigger when channel becomes empty
    if (oldState.channelId && !newState.channelId) {
        const channel = oldState.channel;
        const botMember = channel.guild.members.me;
        
        if (channel.members.size === 1 && channel.members.has(botMember.id)) {
            const session = activeRecordings.get(channel.guild.id);
            if (session) {
                console.log(`Everyone left. Wrapping up recording files...`);
                
                // 1. Properly stop recording streams
                session.connection.destroy();
                session.mixer.unpipe(session.writeStream);
                session.writeStream.end();
                
                // 2. Wait a split second for the file system to completely lock the file, then convert
                session.writeStream.on('finish', () => {
                    console.log(`Raw PCM saved. Automatically kicking off FFmpeg conversion...`);
                    
                    const ffmpegCommand = `"C:\\ffmpeg\\bin\\ffmpeg.exe" -f s16le -ar 48k -ac 2 -i "${session.pcmPath}" "${session.mp3Path}"`;
                    
                    exec(ffmpegCommand, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`FFmpeg Auto-Conversion Error:`, error);
                            return;
                        }
                        console.log(`Success! Audio converted. Saved as: ${path.basename(session.mp3Path)}`);
                        
                        // Optional: Delete the raw heavy .pcm file to save space since we have the MP3 now
                        fs.unlink(session.pcmPath, (err) => {
                            if (err) console.error("Couldn't delete temp PCM file:", err);
                            else console.log("Cleaned up temporary PCM file.");
                        });
                    });
                });

                activeRecordings.delete(channel.guild.id);
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);