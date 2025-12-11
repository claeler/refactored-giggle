/*  
  Mafia Game for WhatsApp Bot
  Converted from Python by @M_N_3_M
  Integration with Lenwy WhatsApp Bot
*/

const fs = require('fs');
const path = require('path');

// Game State Enum
const GameState = {
    LOBBY: 1,
    NIGHT: 2,
    DAY: 3,
    VOTING: 4,
    ENDED: 5
};

// Role Enum
const Role = {
    MAFIA: "مافيا",
    CIVILIAN: "مدني",
    DOCTOR: "طبيب",
    POLICE: "شرطي",
    SERIAL_KILLER: "قاتل متسلسل",
    DETECTIVE: "محقق",
    LOVER: "عاشق",
    REVOLUTIONARY: "ثائر"
};

class MafiaGame {
    constructor(chatId) {
        this.chatId = chatId;
        this.players = new Map(); // Map of userId -> player object
        this.state = GameState.LOBBY;
        this.dayCount = 0;
        this.mafiaChatId = null;
        this.settings = {
            nightDuration: 60,
            dayDuration: 120,
            votingDuration: 60
        };
        this.votes = new Map();
        this.nightActions = new Map();
        this.rolesAssigned = false;
        this.timers = {
            night: null,
            day: null,
            voting: null
        };
        this.waitingForAction = new Set(); // Players who need to choose night actions
    }

    addPlayer(userId, name) {
        if (this.state !== GameState.LOBBY) return false;
        if (!this.players.has(userId)) {
            this.players.set(userId, {
                name: name,
                role: null,
                alive: true,
                protected: false,
                investigated: false,
                causeOfDeath: null
            });
            return true;
        }
        return false;
    }

    assignRoles() {
        if (this.rolesAssigned) return false;
        
        const numPlayers = this.players.size;
        if (numPlayers < 3) return false;
        
        let roles = [];
        
        // Calculate mafia count
        const mafiaCount = Math.max(1, Math.floor(numPlayers / 4));
        for (let i = 0; i < mafiaCount; i++) {
            roles.push(Role.MAFIA);
        }
        
        // Add special roles based on player count
        const specialRoles = [];
        if (numPlayers >= 4) specialRoles.push(Role.DOCTOR);
        if (numPlayers >= 5) specialRoles.push(Role.POLICE);
        if (numPlayers >= 7) specialRoles.push(Role.SERIAL_KILLER);
        if (numPlayers >= 9) specialRoles.push(Role.DETECTIVE);
        
        roles = roles.concat(specialRoles);
        
        // Fill remaining with civilians
        const remaining = numPlayers - roles.length;
        for (let i = 0; i < remaining; i++) {
            roles.push(Role.CIVILIAN);
        }
        
        // Shuffle roles
        for (let i = roles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [roles[i], roles[j]] = [roles[j], roles[i]];
        }
        
        // Assign roles to players
        const playerIds = Array.from(this.players.keys());
        playerIds.forEach((userId, index) => {
            this.players.get(userId).role = roles[index];
        });
        
        this.rolesAssigned = true;
        return true;
    }

    getRoleDescription(role) {
        const descriptions = {
            [Role.MAFIA]: "🔪 أنت عضو في المافيا! في كل ليلة، تختار ضحية لقتلها. هدفك هو التخلص من جميع المدنيين.",
            [Role.CIVILIAN]: "👤 أنت مدني عادي! هدفك هو اكتشاف وإعدام جميع أعضاء المافيا قبل أن يقضوا عليك.",
            [Role.DOCTOR]: "💉 أنت الطبيب! في كل ليلة يمكنك اختيار شخص لحمايته من الموت (بما في ذلك نفسك).",
            [Role.POLICE]: "👮 أنت الشرطي! في كل ليلة يمكنك التحقق من هوية شخص لمعرفة إذا كان من المافيا أم لا.",
            [Role.SERIAL_KILLER]: "🔥 أنت القاتل المتسلسل! هدفك قتل الجميع. يمكنك قتل شخص كل ليلة.",
            [Role.DETECTIVE]: "🔍 أنت المحقق! يمكنك التحقق من تحركات شخص واحد كل ليلة.",
            [Role.LOVER]: "💕 أنت العاشق! تعرف من هو شريكك وعليك حمايته. إذا مات شريكك، تموت أنت أيضًا.",
            [Role.REVOLUTIONARY]: "💣 أنت الثائر! يمكنك التضحية بنفسك مرة واحدة خلال اللعبة لقتل شخص مشتبه به."
        };
        return descriptions[role] || "لا يوجد وصف لهذا الدور.";
    }

    getAlivePlayers(excludeMafia = false, excludeSelf = null) {
        const alive = new Map();
        for (const [userId, player] of this.players.entries()) {
            if (player.alive) {
                if (excludeMafia && player.role === Role.MAFIA) continue;
                if (excludeSelf && userId === excludeSelf) continue;
                alive.set(userId, player);
            }
        }
        return alive;
    }

    clearTimers() {
        for (const timer of Object.values(this.timers)) {
            if (timer) clearTimeout(timer);
        }
    }
}

// Game Manager
class MafiaGameManager {
    constructor() {
        this.games = new Map(); // chatId -> MafiaGame
        this.loadGames();
    }

    loadGames() {
        try {
            if (fs.existsSync('./database/mafia_games.json')) {
                const data = JSON.parse(fs.readFileSync('./database/mafia_games.json', 'utf8'));
                for (const [chatId, gameData] of Object.entries(data)) {
                    const game = new MafiaGame(chatId);
                    game.players = new Map(Object.entries(gameData.players || {}));
                    game.state = gameData.state || GameState.LOBBY;
                    game.dayCount = gameData.dayCount || 0;
                    game.votes = new Map(Object.entries(gameData.votes || {}));
                    game.nightActions = new Map(Object.entries(gameData.nightActions || {}));
                    game.rolesAssigned = gameData.rolesAssigned || false;
                    this.games.set(chatId, game);
                }
            }
        } catch (error) {
            console.error('Error loading mafia games:', error);
        }
    }

    saveGames() {
        try {
            const data = {};
            for (const [chatId, game] of this.games.entries()) {
                data[chatId] = {
                    players: Object.fromEntries(game.players),
                    state: game.state,
                    dayCount: game.dayCount,
                    votes: Object.fromEntries(game.votes),
                    nightActions: Object.fromEntries(game.nightActions),
                    rolesAssigned: game.rolesAssigned
                };
            }
            
            // Ensure directory exists
            const dir = './database';
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync('./database/mafia_games.json', JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving mafia games:', error);
        }
    }

    newGame(chatId, userId, userName) {
        if (this.games.has(chatId)) {
            return { error: "❗ هناك لعبة قائمة بالفعل في هذه المجموعة!" };
        }

        const game = new MafiaGame(chatId);
        game.addPlayer(userId, userName);
        this.games.set(chatId, game);
        this.saveGames();

        return {
            success: true,
            message: `🎉 **تم إنشاء لعبة مافيا جديدة!**\n\n👤 **منشئ اللعبة:** ${userName}\n\n📋 **خطوات الانضمام:**\nاستخدم الأمر !join للانضمام\nعند اكتمال العدد، استخدم !startgame\n\n👥 **العدد المطلوب:** 3 لاعبين على الأقل\n👥 **اللاعبون حالياً:** 1`
        };
    }

    joinGame(chatId, userId, userName) {
        const game = this.games.get(chatId);
        if (!game) {
            return { error: "❗ لا توجد لعبة قائمة للانضمام إليها! استخدم !newgame لبدء لعبة جديدة." };
        }

        if (game.state !== GameState.LOBBY) {
            return { error: "❗ اللعبة بدأت بالفعل! لا يمكن الانضمام الآن." };
        }

        if (game.addPlayer(userId, userName)) {
            this.saveGames();
            return {
                success: true,
                message: `✅ **${userName}** انضم إلى اللعبة!\n👥 **عدد اللاعبين:** ${game.players.size}`
            };
        } else {
            return { error: "❗ أنت بالفعل منضم إلى اللعبة!" };
        }
    }

    startGame(chatId) {
        const game = this.games.get(chatId);
        if (!game) {
            return { error: "❗ لا توجد لعبة قائمة! استخدم !newgame لبدء لعبة جديدة." };
        }

        if (game.players.size < 3) {
            return { error: "❗ تحتاج إلى 3 لاعبين على الأقل لبدء اللعبة!" };
        }

        if (!game.assignRoles()) {
            return { error: "❗ خطأ في توزيع الأدوار!" };
        }

        game.state = GameState.NIGHT;
        game.dayCount = 0;
        
        this.saveGames();

        // Send role messages to players
        const roleMessages = [];
        for (const [userId, player] of game.players.entries()) {
            const roleDescription = game.getRoleDescription(player.role);
            roleMessages.push({
                userId: userId,
                message: `🎭 دورك في اللعبة:\n\n${player.role}\n\n${roleDescription}`
            });
        }

        return {
            success: true,
            message: "🎮 تم بدء اللعبة بنجاح!\n✅ تم إرسال الأدوار لجميع اللاعبين في الرسائل الخاصة.\n🌙 نبدأ الآن بالليلة الأولى...",
            roleMessages: roleMessages
        };
    }

    showPlayers(chatId) {
        const game = this.games.get(chatId);
        if (!game) {
            return { error: "❗ لا توجد لعبة قائمة!" };
        }

        let playersList = [];
        let index = 1;
        for (const player of game.players.values()) {
            const status = player.alive ? "🟢" : "🔴";
            playersList.push(`${index}. ${status} ${player.name}`);
            index++;
        }

        let message = `👥 **اللاعبون (${game.players.size}):**\n\n`;
        message += playersList.join('\n');

        if (game.state === GameState.LOBBY) {
            const needed = Math.max(0, 3 - game.players.size);
            message += `\n\n💡 تحتاج ${needed} لاعب إضافي على الأقل لبدء اللعبة`;
        }

        return { success: true, message };
    }

    showAlive(chatId) {
        const game = this.games.get(chatId);
        if (!game) {
            return { error: "❗ لا توجد لعبة قائمة!" };
        }

        const alivePlayers = game.getAlivePlayers();
        if (alivePlayers.size === 0) {
            return { message: "💀 لا يوجد لاعبون أحياء!" };
        }

        let aliveList = [];
        let index = 1;
        for (const player of alivePlayers.values()) {
            aliveList.push(`${index}. 🟢 ${player.name}`);
            index++;
        }

        const message = `💚 **اللاعبون الأحياء (${alivePlayers.size}):**\n\n` + aliveList.join('\n');
        return { success: true, message };
    }

    showRole(userId) {
        for (const game of this.games.values()) {
            if (game.players.has(userId)) {
                const player = game.players.get(userId);
                if (game.state === GameState.LOBBY) {
                    return { error: "❗ اللعبة لم تبدأ بعد! سيتم إبلاغك بدورك عند بدء اللعبة." };
                }
                if (!player.alive) {
                    return { error: "💀 أنت ميت! لا يمكنك المشاركة في اللعبة." };
                }
                const roleDescription = game.getRoleDescription(player.role);
                return {
                    success: true,
                    message: `🎭 **دورك:** ${player.role}\n\n${roleDescription}`
                };
            }
        }
        return { error: "❗ لست منضماً لأي لعبة نشطة!" };
    }

    showRules() {
        const rules = `
📜 **قواعد لعبة المافيا:**

🎯 **الهدف:**
• **المدنيون:** القضاء على جميع المافيا
• **المافيا:** تساوي عددهم مع المدنيين أو تفوقهم

⏰ **مراحل اللعبة:**

🌙 **الليل:**
• المافيا تختار ضحية للقتل
• الطبيب يختار شخصاً للحماية  
• الشرطي يتحقق من هوية شخص
• الأدوار الأخرى تؤدي مهامها

🌞 **النهار:**
• مناقشة ومحاولة اكتشاف المافيا
• وقت للتفكير والتخطيط

⚖️ **التصويت:**
• الجميع يصوت لإعدام شخص مشتبه به
• الأكثر أصواتاً يُعدم
• في حالة التعادل، لا يُعدم أحد

🎭 **الأدوار:**
• **مافيا** 🔪: تقتل ليلاً
• **مدني** 👤: يصوت ويناقش فقط
• **طبيب** 💉: يحمي شخصاً كل ليلة
• **شرطي** 👮: يكشف هوية شخص كل ليلة
• **قاتل متسلسل** 🔥: يقتل لحسابه الخاص
• **محقق** 🔍: يتتبع تحركات الآخرين

📋 **أوامر مفيدة:** !mafiahelp
`;
        return { success: true, message: rules };
    }

    gameStatus(chatId) {
        const game = this.games.get(chatId);
        if (!game) {
            return { error: "❗ لا توجد لعبة قائمة في هذه المجموعة!" };
        }

        const statusMessages = {
            [GameState.LOBBY]: "🏛️ صالة الانتظار",
            [GameState.NIGHT]: `🌙 الليل ${game.dayCount}`,
            [GameState.DAY]: `🌞 النهار ${game.dayCount}`,
            [GameState.VOTING]: `⚖️ التصويت - اليوم ${game.dayCount}`,
            [GameState.ENDED]: "🏁 انتهت"
        };

        const aliveCount = game.getAlivePlayers().size;
        const totalCount = game.players.size;

        let message = `📊 **حالة اللعبة:**\n\n`;
        message += `🎮 **المرحلة:** ${statusMessages[game.state] || 'غير معروف'}\n`;
        message += `👥 **اللاعبون:** ${aliveCount}/${totalCount} (أحياء/المجموع)\n`;

        if (game.state !== GameState.LOBBY) {
            let mafiaAlive = 0;
            for (const player of game.players.values()) {
                if (player.alive && player.role === Role.MAFIA) {
                    mafiaAlive++;
                }
            }
            const civiliansAlive = aliveCount - mafiaAlive;
            message += `🔴 **المافيا الأحياء:** ${mafiaAlive}\n`;
            message += `🔵 **المدنيون الأحياء:** ${civiliansAlive}\n`;
        }

        return { success: true, message };
    }

    leaveGame(chatId, userId) {
        const game = this.games.get(chatId);
        if (!game) {
            return { error: "❗ لا توجد لعبة قائمة!" };
        }

        if (!game.players.has(userId)) {
            return { error: "❗ أنت لست منضماً لهذه اللعبة!" };
        }

        if (game.state !== GameState.LOBBY) {
            return { error: "❗ لا يمكن مغادرة اللعبة بعد بدايتها!" };
        }

        const playerName = game.players.get(userId).name;
        game.players.delete(userId);
        
        this.saveGames();

        if (game.players.size === 0) {
            this.games.delete(chatId);
            this.saveGames();
            return { success: true, message: `👋 **${playerName}** غادر اللعبة.\n🗑️ تم حذف اللعبة لعدم وجود لاعبين.` };
        }

        return { 
            success: true, 
            message: `👋 **${playerName}** غادر اللعبة.\n👥 **اللاعبون المتبقون:** ${game.players.size}` 
        };
    }

    cancelGame(chatId, userId) {
        const game = this.games.get(chatId);
        if (!game) {
            return { error: "❗ لا توجد لعبة قائمة!" };
        }

        // Check if user is creator (first player) or admin
        const players = Array.from(game.players.keys());
        const isCreator = players[0] === userId;
        
        if (!isCreator) {
            return { error: "❗ يمكن فقط لمنشئ اللعبة إلغاؤها!" };
        }

        game.clearTimers();
        this.games.delete(chatId);
        this.saveGames();

        return { success: true, message: "❌ **تم إلغاء اللعبة بواسطة المنشئ.**" };
    }

    helpCommand() {
        const helpText = `
🎮 **أوامر بوت المافيا:**

**🎯 أوامر أساسية:**
• !mafia - بدء لعبة جديدة
• !mafiajoin - الانضمام للعبة
• !mafialeave - مغادرة اللعبة (قبل البداية فقط)
• !mafiastart - بدء اللعبة
• !mafiacancel - إلغاء اللعبة (للمنشئ فقط)

**📊 معلومات:**
• !mafiaplayers - قائمة جميع اللاعبين
• !mafiaalive - قائمة اللاعبين الأحياء
• !mafiastatus - حالة اللعبة الحالية
• !mafiarole - عرض دورك
• !mafiarules - قواعد اللعبة المفصلة

**💡 نصائح:**
• الحد الأدنى: 3 لاعبين
• الأدوار تُرسل في الرسائل الخاصة فقط
• استخدم !mafiahelp لعرض هذه القائمة
`;
        return { success: true, message: helpText };
    }
}

// Create and export game manager instance
const mafiaManager = new MafiaGameManager();

module.exports = {
    mafiaManager,
    GameState,
    Role,
    MafiaGame
};