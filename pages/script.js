document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".command-btn");
  const details = document.getElementById("details");

  const commandInfo = {
    ping: {
      title: "/ping",
      description: "Botの応答速度を計測して表示します。"
    },
    auth: {
      title: "/認証",
      description: "ユーザー認証を行い、認証済みロールを付与します。"
    },
    profile: {
      title: "/プロフィール",
      description: "あなたのプロフィール情報を表示します。"
    },
    friendcode: {
      title: "/フレンドコード",
      description: "登録されているフレンドコードを表示します。"
    }
  };

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      const info = commandInfo[target];
      details.innerHTML = `
        <h3>${info.title}</h3>
        <p>${info.description}</p>
      `;
    });
  });
});
