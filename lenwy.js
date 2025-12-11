/*  

  Made By Lenwy
  Base : Lenwy
  WhatsApp : wa.me/6283829814737
  Telegram : t.me/ilenwy
  Youtube : @Lenwy

  Channel : https://whatsapp.com/channel/0029VaGdzBSGZNCmoTgN2K0u

  Copy Code?, Recode?, Rename?, Reupload?, Reseller? Taruh Credit Ya :D

  Mohon Untuk Tidak Menghapus Watermark Di Dalam Kode Ini

*/

// Import Module
require('./len')
require('./database/Menu/LenwyMenu')
const fs = require('fs');
const axios = require('axios');

// Import Scrape
const Ai4Chat = require('./scrape/Ai4Chat');
const tiktok2 = require('./scrape/Tiktok');

// Import Mafia Game
const { mafiaManager } = require('./mafia');

module.exports = async (lenwy, m) => {
    const msg = m.messages[0];
    if (!msg.message) return;

    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    const sender = msg.key.remoteJid;
    const pushname = msg.pushName || "Lenwy";
    const args = body.slice(1).trim().split(" ");
    const command = args.shift().toLowerCase();
    const q = args.join(" ");

    if (!body.startsWith(prefix)) return;

    const lenwyreply = (teks) => lenwy.sendMessage(sender, { text: teks }, { quoted: msg });
    const isGroup = sender.endsWith('@g.us');
    const isAdmin = (admin.includes(sender))
    const menuImage = fs.readFileSync(image);

switch (command) {

// Menu
case "menu": {
    await lenwy.sendMessage(sender,
        {
            image: menuImage,
            caption: lenwymenu,
            mentions: [sender]
        },
    { quoted: msg }
    )
}
break

// Hanya Admin
case "admin": {
    if (!isAdmin) return lenwyreply(mess.admin); // COntoh Penerapan Hanya Admin
    lenwyreply("🎁 *Kamu Adalah Admin*"); // Admin Akan Menerima Pesan Ini
}
break

// Hanya Group
case "group": {
    if (!isGroup) return lenwyreply(mess.group); // Contoh Penerapan Hanya Group
    lenwyreply("🎁 *Kamu Sedang Berada Di Dalam Grup*"); // Pesan Ini Hanya Akan Dikirim Jika Di Dalam Grup
}
break

// AI Chat
case "ai": {
    if (!q) return lenwyreply("☘️ *Contoh:* !ai Apa itu JavaScript?");
        lenwyreply(mess.wait);
    try {
        const lenai = await Ai4Chat(q);
            await lenwyreply(`*Lenwy AI*\n\n${lenai}`);
                } catch (error) {
            console.error("Error:", error);
        lenwyreply(mess.error);
    }
}
break;

case "ttdl": {
    if (!q) return lenwyreply("⚠ *Mana Link Tiktoknya?*");
        lenwyreply(mess.wait);
    try {
        const result = await tiktok2(q); // Panggil Fungsi Scraper

            // Kirim Video
            await lenwy.sendMessage(
                sender,
                    {
                        video: { url: result.no_watermark },
                        caption: `*🎁 Lenwy Tiktok Downloader*`
                    },
                { quoted: msg }
            );

        } catch (error) {
            console.error("Error TikTok DL:", error);
        lenwyreply(mess.error);
    }
}
break;

case "igdl": {
    if (!q) return lenwyreply("⚠ *Mana Link Instagramnya?*");
    try {
        lenwyreply(mess.wait);

        // Panggil API Velyn
        const apiUrl = `https://www.velyn.biz.id/api/downloader/instagram?url=${encodeURIComponent(q)}`;
        const response = await axios.get(apiUrl);

        if (!response.data.status || !response.data.data.url[0]) {
            throw new Error("Link tidak valid atau API error");
        }

        const data = response.data.data;
        const mediaUrl = data.url[0];
        const metadata = data.metadata;

        // Kirim Media
        if (metadata.isVideo) {
            await lenwy.sendMessage(
                sender,
                    {
                        video: { url: mediaUrl },
                        caption: `*Instagram Reel*\n\n` +
                            `*Username :* ${metadata.username}\n` +
                            `*Likes :* ${metadata.like.toLocaleString()}\n` +
                            `*Comments :* ${metadata.comment.toLocaleString()}\n\n` +
                            `*Caption :* ${metadata.caption || '-'}\n\n` +
                            `*Source :* ${q}`
                    },
                    { quoted: msg }
                );
        } else {
            await lenwy.sendMessage(
                sender,
                    {
                        image: { url: mediaUrl },
                        caption: `*Instagram Post*\n\n` +
                            `*Username :* ${metadata.username}\n` +
                            `*Likes :* ${metadata.like.toLocaleString()}\n\n` +
                            `*Caption :* ${metadata.caption || '-'}`
                    },
                    { quoted: msg }
                );
            }

        } catch (error) {
            console.error("Error Instagram DL:", error);
        lenwyreply(mess.error);
    }
}
break;

// Game Tebak Angka
case "tebakangka": {
    const target = Math.floor(Math.random() * 100);
        lenwy.tebakGame = { target, sender };
    lenwyreply("*Tebak Angka 1 - 100*\n*Ketik !tebak [Angka]*");
}
break;

case "tebak": {
    if (!lenwy.tebakGame || lenwy.tebakGame.sender !== sender) return;
        const guess = parseInt(args[0]);
    if (isNaN(guess)) return lenwyreply("❌ *Masukkan Angka!*");

    if (guess === lenwy.tebakGame.target) {
        lenwyreply(`🎉 *Tebakkan Kamu Benar!*`);
            delete lenwy.tebakGame;
        } else {
            lenwyreply(guess > lenwy.tebakGame.target ? "*Terlalu Tinggi!*" : "*Terlalu rendah!*");
    }
}
break;

case "quote": {
    const quotes = [
        "Jangan menyerah, hari buruk akan berlalu.",
        "Kesempatan tidak datang dua kali.",
        "Kamu lebih kuat dari yang kamu kira.",
        "Hidup ini singkat, jangan sia-siakan."
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    lenwyreply(`*Quote Hari Ini :*\n_"${randomQuote}"_`);
}
break;

// ==================== MAFIA GAME COMMANDS ====================

case "mafia": {
    if (isGroup) {
        const userId = sender.split('@')[0];
        const result = mafiaManager.newGame(sender, userId, pushname);
        lenwyreply(result.error || result.message);
    } else {
        lenwyreply("❗ *Permainan Mafia hanya bisa dimulai di dalam grup!*");
    }
}
break;

case "mafiajoin": {
    if (isGroup) {
        const userId = sender.split('@')[0];
        const result = mafiaManager.joinGame(sender, userId, pushname);
        lenwyreply(result.error || result.message);
    } else {
        lenwyreply("❗ *Permainan Mafia hanya tersedia di dalam grup!*");
    }
}
break;

case "mafiastart": {
    if (isGroup) {
        const result = mafiaManager.startGame(sender);
        lenwyreply(result.error || result.message);
        
        // Send role messages to players privately
        if (result.success && result.roleMessages) {
            for (const roleMsg of result.roleMessages) {
                setTimeout(async () => {
                    try {
                        await lenwy.sendMessage(
                            `${roleMsg.userId}@s.whatsapp.net`, 
                            { text: roleMsg.message }
                        );
                    } catch (error) {
                        console.error(`Failed to send role to ${roleMsg.userId}:`, error);
                    }
                }, 1000);
            }
        }
    } else {
        lenwyreply("❗ *Permainan Mafia hanya tersedia di dalam grup!*");
    }
}
break;

case "mafiaplayers": {
    if (isGroup) {
        const result = mafiaManager.showPlayers(sender);
        lenwyreply(result.error || result.message);
    } else {
        lenwyreply("❗ *Permainan Mafia hanya tersedia di dalam grup!*");
    }
}
break;

case "mafiaalive": {
    if (isGroup) {
        const result = mafiaManager.showAlive(sender);
        lenwyreply(result.error || result.message);
    } else {
        lenwyreply("❗ *Permainan Mafia hanya tersedia di dalam grup!*");
    }
}
break;

case "mafiarole": {
    const userId = sender.split('@')[0];
    const result = mafiaManager.showRole(userId);
    lenwyreply(result.error || result.message);
}
break;

case "mafiarules": {
    const result = mafiaManager.showRules();
    lenwyreply(result.message);
}
break;

case "mafiastatus": {
    if (isGroup) {
        const result = mafiaManager.gameStatus(sender);
        lenwyreply(result.error || result.message);
    } else {
        lenwyreply("❗ *Permainan Mafia hanya tersedia di dalam grup!*");
    }
}
break;

case "mafialeave": {
    if (isGroup) {
        const userId = sender.split('@')[0];
        const result = mafiaManager.leaveGame(sender, userId);
        lenwyreply(result.error || result.message);
    } else {
        lenwyreply("❗ *Permainan Mafia hanya tersedia di dalam grup!*");
    }
}
break;

case "mafiacancel": {
    if (isGroup) {
        const userId = sender.split('@')[0];
        const result = mafiaManager.cancelGame(sender, userId);
        lenwyreply(result.error || result.message);
    } else {
        lenwyreply("❗ *Permainan Mafia hanya tersedia di dalam grup!*");
    }
}
break;

case "mafiahelp": {
    const result = mafiaManager.helpCommand();
    lenwyreply(result.message);
}
break;

// ==================== END MAFIA GAME COMMANDS ====================

        default: { lenwyreply(mess.default) }
    }
}